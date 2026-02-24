/**
 * Pegasys profile: data mapping and slide pipeline.
 *
 * EXCEL STRUCTURE (Pegasys Responses.xlsx)
 * ─────────────────────────────────────────
 * Sheets : Year-named ("2026", "2024", "2023", "2022") – most-recent = current.
 * Header rows (per sheet):
 *   Row 0 – Question numbers (1, 2, 3 … 76)
 *   Row 1 – Major groups   (Organisation Drivers | Enablers | Commitment | Effort and Retention | Comments | NPS)
 *   Row 2 – Dimensions     (Brand Affinity | Company Leadership | Strategy | …)
 *   Row 3 – Question text  (clean, no preamble)
 *   Row 4 – Column labels  (present ONLY in the most-recent sheet; older sheets start data here)
 * Data rows start at row 5 (current) or row 4 (prior years).
 *
 * COLUMN LAYOUT (0-based)
 *   0   code (UUID)
 *   1   Practice        ← primary breakdown
 *   2   Location
 *   3   Age
 *   4   Tenure
 *   5   Race
 *   6   Gender
 *   7   Nationality
 *   8   Job Level
 *   9   Overall engagement score (%)
 *  10   Organisation Drivers aggregate (%)
 *  11   Enablers aggregate (%)
 *  12   Commitment aggregate (%)
 *  13   Effort and Retention aggregate (%)
 *  14   (blank separator)
 *  15+  Dimension aggregates + individual question scores
 * 181-185  Comments (KEEP, START, STOP, most improvement, least improvement)
 * 186      NPS (0-10 integer)
 *
 * Score encoding: 4-point Likert → 0 / 33 / 66 / 100 (percentages).
 * Multi-select and text columns are interspersed but excluded from scored question lists.
 */
(function () {
  'use strict';

  // ── Column indices ────────────────────────────────────────────────────────
  const COL = {
    CODE: 0,
    PRACTICE: 1,
    LOCATION: 2,
    AGE: 3,
    TENURE: 4,
    RACE: 5,
    GENDER: 6,
    NATIONALITY: 7,
    JOB_LEVEL: 8,
    OVERALL: 9,
    ORG_DRIVERS: 10,
    ENABLERS: 11,
    COMMITMENT: 12,
    EFFORT_RETENTION: 13,
    NPS: 186
  };

  const COMMENT_COLS = [181, 182, 183, 184, 185];
  const COMMENT_CHARS_PER_LINE = 178;
  const COMMENT_MAX_LINES_PER_SLIDE = 28;

  // ── Groups (high-level pillars with pre-calculated aggregates) ────────────
  const GROUPS = [
    { name: 'Organisation Drivers', col: COL.ORG_DRIVERS },
    { name: 'Enablers',            col: COL.ENABLERS },
    { name: 'Commitment',          col: COL.COMMITMENT },
    { name: 'Effort & Retention',  col: COL.EFFORT_RETENTION }
  ];

  // ── Dimensions (sub-categories with aggregate + scored question columns) ──
  const DIMENSIONS = [
    { name: 'Brand Affinity',              group: 'Organisation Drivers', aggCol: 15,  questionCols: [16, 17, 18, 19] },
    { name: 'Company Leadership',          group: 'Organisation Drivers', aggCol: 33,  questionCols: [34, 35, 36] },
    { name: 'Strategy',                    group: 'Organisation Drivers', aggCol: 37,  questionCols: [38, 39, 40] },
    { name: 'Change Management',           group: 'Enablers',            aggCol: 41,  questionCols: [42] },
    { name: 'Collaboration',               group: 'Enablers',            aggCol: 43,  questionCols: [44, 45] },
    { name: 'Communication',               group: 'Enablers',            aggCol: 46,  questionCols: [47, 48, 49] },
    { name: 'Innovation',                  group: 'Enablers',            aggCol: 50,  questionCols: [51, 52, 53, 54] },
    { name: 'Management',                  group: 'Enablers',            aggCol: 55,  questionCols: [56, 57, 58, 59, 60, 61, 62] },
    { name: 'Performance',                 group: 'Enablers',            aggCol: 101, questionCols: [102, 103, 104, 105] },
    { name: 'Reward & Recognition',        group: 'Enablers',            aggCol: 106, questionCols: [107, 108, 109, 110] },
    { name: 'Inspiration',                 group: 'Commitment',          aggCol: 111, questionCols: [112, 113, 114] },
    { name: 'Integrity',                   group: 'Commitment',          aggCol: 115, questionCols: [116, 117] },
    { name: 'Personal Growth',             group: 'Commitment',          aggCol: 118, questionCols: [119, 120, 121, 122] },
    { name: 'Support',                     group: 'Commitment',          aggCol: 123, questionCols: [124, 125, 126, 127, 128, 129, 130, 131] },
    { name: 'Transformation & Inclusivity',group: 'Commitment',          aggCol: 132, questionCols: [133, 134, 135, 136, 137, 138] },
    { name: 'Effort',                      group: 'Effort & Retention',  aggCol: 139, questionCols: [140, 141, 142] },
    { name: 'Retention',                   group: 'Effort & Retention',  aggCol: 143, questionCols: [144, 145] }
  ];

  const BREAKDOWN_COL = {
    practice:    COL.PRACTICE,
    location:    COL.LOCATION,
    age:         COL.AGE,
    tenure:      COL.TENURE,
    race:        COL.RACE,
    gender:      COL.GENDER,
    nationality: COL.NATIONALITY,
    jobLevel:    COL.JOB_LEVEL
  };

  const SIGNIFICANT_CHANGE_THRESHOLD = 5;

  /** Tenure breakdown order (shortest to longest). Used to sort heatmap rows by tenure. */
  const TENURE_ORDER = ['<1', '1 - 3 years', '4 - 5 years', '6 - 10 years', '>10 years'];

  function getTenureSortIndex(label) {
    var s = String(label || '').trim().replace(/\s*-\s*/g, '-');
    var i = TENURE_ORDER.indexOf(s);
    if (i !== -1) return i;
    if (/^<1\b/i.test(s)) return 0;
    if (/^1-3/i.test(s)) return 1;
    if (/^4-5/i.test(s)) return 2;
    if (/^6-10/i.test(s)) return 3;
    if (/^>10/i.test(s)) return 4;
    return TENURE_ORDER.length;
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  function averageColumn(rows, colIndex) {
    const values = rows
      .map(r => r[colIndex])
      .filter(v => v !== null && v !== undefined && v !== '' && !isNaN(v))
      .map(Number);
    if (!values.length) return null;
    return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
  }

  function groupRowsByColumn(rows, colIndex) {
    const groups = {};
    rows.forEach(row => {
      const key = (row[colIndex] ?? '').toString().trim();
      if (!key) return;
      if (!groups[key]) groups[key] = [];
      groups[key].push(row);
    });
    return groups;
  }

  function detectDataStartRow(json) {
    const row4 = json[4];
    if (row4 && typeof row4[0] === 'string' && row4[0].toLowerCase() === 'code') {
      return 5;
    }
    return 4;
  }

  function cleanQuestionText(raw) {
    if (!raw) return '';
    let text = raw.toString().trim();
    text = text.replace(/^Please rate your level of agreement with the following statements\s*[:\-–—]+\s*/i, '');
    text = text.replace(/\r\n/g, ' ').replace(/\n/g, ' ').replace(/\s{2,}/g, ' ').trim();
    return text;
  }

  function getAllYearRows(excelData) {
    return (excelData.allYears || []).map(function (entry) {
      return { year: entry.year, rows: entry.data.rows };
    });
  }

  // ── Calculation functions ─────────────────────────────────────────────────

  function calculateBarChartData(excelData) {
    var categories = ['Pegasys\nOverall'].concat(GROUPS.map(function (g) { return g.name.replace(/ & /g, ' &\n'); }));
    var cols = [COL.OVERALL].concat(GROUPS.map(function (g) { return g.col; }));
    var yearEntries = getAllYearRows(excelData);

    var series = yearEntries.map(function (entry) {
      return {
        label: entry.year,
        scores: cols.map(function (c) { return averageColumn(entry.rows, c); })
      };
    });

    return { categories: categories, series: series };
  }

  function buildHeatmapColumns() {
    return [
      { name: 'OVERALL', col: COL.OVERALL },
      ...DIMENSIONS.map(d => ({ name: d.name.toUpperCase(), col: d.aggCol }))
    ];
  }

  function calculateHeatmapData(excelData, breakdownType, options) {
    options = options || {};
    const current = excelData.current;
    const previous = excelData.previous;
    const breakdownCol = BREAKDOWN_COL[breakdownType];
    if (breakdownCol === undefined) throw new Error('Unknown breakdown: ' + breakdownType);

    const showShifts = options.showShiftIndicators !== false && Boolean(previous);
    const heatmapDims = buildHeatmapColumns();

    function buildRow(name, rows, prevRows, isOverall) {
      const scores = heatmapDims.map(d => averageColumn(rows, d.col));
      let shifts = null;
      if (showShifts && prevRows && prevRows.length) {
        const prev = heatmapDims.map(d => averageColumn(prevRows, d.col));
        shifts = scores.map((curr, i) => {
          if (curr === null || prev[i] === null) return { previous: null, isSignificant: false };
          return { previous: prev[i], isSignificant: Math.abs(curr - prev[i]) >= SIGNIFICANT_CHANGE_THRESHOLD };
        });
      }
      return { name, sampleSize: rows.length, scores, shifts, isOverall };
    }

    const overallRow = buildRow('PEGASYS', current.rows, previous ? previous.rows : null, true);
    const currentGroups = groupRowsByColumn(current.rows, breakdownCol);
    const previousGroups = previous ? groupRowsByColumn(previous.rows, breakdownCol) : {};

    var keys = Object.keys(currentGroups);
    if (breakdownType === 'tenure') {
      keys = keys.slice().sort(function (a, b) {
        return getTenureSortIndex(a) - getTenureSortIndex(b);
      });
    } else {
      keys.sort();
    }
    const breakdownRows = keys.map(function (key) {
      return buildRow(key, currentGroups[key], previousGroups[key] || null, false);
    });

    return {
      columnHeaders: heatmapDims.map(d => d.name),
      rows: [overallRow, ...breakdownRows]
    };
  }

  function calculateTopBottomStatements(excelData, limit) {
    limit = limit || 5;
    var yearEntries = getAllYearRows(excelData);
    var currentRows = excelData.current.rows;
    var previousRows = excelData.previous ? excelData.previous.rows : null;
    var relevantEntries = yearEntries.slice(0, 2); // [current, previous]
    var yearLabels = relevantEntries.map(function (e) { return e.year; });

    var statements = [];
    DIMENSIONS.forEach(function (dim) {
      dim.questionCols.forEach(function (colIdx) {
        var raw = excelData.current.questionHeaders[colIdx];
        if (!raw) return;
        var currentScore = averageColumn(currentRows, colIdx);
        if (currentScore === null) return;
        var previousScore = previousRows ? averageColumn(previousRows, colIdx) : null;

        var scores = {};
        relevantEntries.forEach(function (entry) {
          scores[entry.year] = averageColumn(entry.rows, colIdx);
        });

        statements.push({
          driver: dim.name,
          question: cleanQuestionText(raw),
          columnIndex: colIdx,
          currentScore: currentScore,
          previousScore: previousScore,
          scores: scores,
          shiftValue: previousScore !== null ? currentScore - previousScore : null
        });
      });
    });

    statements.sort(function (a, b) { return b.currentScore - a.currentScore; });

    return {
      topStatements: statements.slice(0, limit),
      bottomStatements: statements.slice(-limit).reverse(),
      yearLabels: yearLabels
    };
  }

  function calculateDimensionStatements(excelData) {
    var yearEntries = getAllYearRows(excelData);
    var yearLabels = yearEntries.map(function (e) { return e.year; });

    var dimensions = DIMENSIONS.map(function (dim) {
      var aggScores = {};
      yearEntries.forEach(function (entry) {
        aggScores[entry.year] = averageColumn(entry.rows, dim.aggCol);
      });

      var aggStatement = {
        text: dim.name,
        isDimensionAggregate: true,
        scores: aggScores
      };

      var questionStatements = dim.questionCols.map(function (colIdx) {
        var raw = excelData.current.questionHeaders[colIdx];
        var scores = {};
        yearEntries.forEach(function (entry) {
          scores[entry.year] = averageColumn(entry.rows, colIdx);
        });
        return {
          text: cleanQuestionText(raw) || ('Question (col ' + colIdx + ')'),
          isDimensionAggregate: false,
          scores: scores
        };
      });

      return {
        name: dim.name,
        statements: [aggStatement].concat(questionStatements)
      };
    });

    return { dimensions: dimensions, yearLabels: yearLabels };
  }

  function paginateQuestions(excelData) {
    var headers = excelData.current.questionHeaders || [];

    var allDimensions = DIMENSIONS.map(function (dim) {
      return {
        name: dim.name,
        group: dim.group,
        questions: dim.questionCols
          .map(function (colIdx) { return cleanQuestionText(headers[colIdx]); })
          .filter(Boolean)
      };
    }).filter(function (d) { return d.questions.length > 0; });

    var COMMENT_LABELS = ['Continue', 'Start', 'Stop', 'Most Improvement', 'Least Improvement'];
    var commentDims = COMMENT_COLS.map(function (col, i) {
      var q = cleanQuestionText(headers[col]);
      return { name: COMMENT_LABELS[i], group: 'Comments', questions: q ? [q] : [] };
    }).filter(function (d) { return d.questions.length > 0; });

    var enpsQ = cleanQuestionText(headers[COL.NPS])
      || "What is the likelihood that you would recommend Pegasys as a 'great place to work' to friends and family?";
    var enpsDim = { name: 'eNPS', group: 'Employee Net Promoter Score', questions: [enpsQ] };

    allDimensions = allDimensions.concat(commentDims).concat([enpsDim]);

    var perPage = 6;
    var pages = [];
    for (var i = 0; i < allDimensions.length; i += perPage) {
      pages.push(allDimensions.slice(i, i + perPage));
    }
    return pages;
  }

  function calculateEnpsTableData(excelData, breakdownType) {
    breakdownType = breakdownType || 'practice';
    const breakdownCol = BREAKDOWN_COL[breakdownType];
    if (breakdownCol === undefined) throw new Error('Unknown breakdown: ' + breakdownType);

    function computeEnps(rows) {
      const values = rows
        .map(r => r[COL.NPS])
        .filter(v => v !== null && v !== undefined && v !== '' && !isNaN(v))
        .map(Number);
      if (!values.length) return { n: 0, enps: null };
      let promoters = 0, detractors = 0;
      values.forEach(v => { if (v >= 9) promoters++; else if (v <= 6) detractors++; });
      return { n: values.length, enps: Math.round(((promoters - detractors) / values.length) * 100) };
    }

    const currentOverall  = computeEnps(excelData.current.rows);
    const previousOverall = excelData.previous ? computeEnps(excelData.previous.rows) : null;

    const currentGroups  = groupRowsByColumn(excelData.current.rows, breakdownCol);
    const previousGroups = excelData.previous ? groupRowsByColumn(excelData.previous.rows, breakdownCol) : {};

    const breakdownRows = Object.keys(currentGroups).sort().map(key => {
      const curr = computeEnps(currentGroups[key]);
      const prev = previousGroups[key] ? computeEnps(previousGroups[key]) : null;
      return {
        label: key,
        n: curr.n,
        currentEnps: curr.enps,
        previousEnps: prev ? prev.enps : null,
        shift: (curr.enps !== null && prev && prev.enps !== null) ? curr.enps - prev.enps : null
      };
    });

    const questionText = cleanQuestionText(excelData.current.questionHeaders[COL.NPS])
      || "What is the likelihood that you would recommend Pegasys as a 'great place to work' to friends and family?";

    return {
      question: questionText,
      overallRow: {
        label: 'PEGASYS',
        n: currentOverall.n,
        currentEnps: currentOverall.enps,
        previousEnps: previousOverall ? previousOverall.enps : null,
        shift: (currentOverall.enps !== null && previousOverall && previousOverall.enps !== null)
          ? currentOverall.enps - previousOverall.enps : null
      },
      breakdownRows,
      yearLabels: {
        current: excelData.currentYearLabel,
        previous: excelData.previousYearLabel || null
      }
    };
  }

  function calculateComments(excelData) {
    var current = excelData.current;
    return COMMENT_COLS.map(function (colIdx) {
      var raw = current.questionHeaders[colIdx];
      var question = raw ? cleanQuestionText(raw) : ('Comment (col ' + colIdx + ')');
      var responses = current.rows
        .map(function (r) { return r[colIdx]; })
        .filter(function (v) { return v !== null && v !== undefined && v !== ''; })
        .map(function (v) { return v.toString().trim(); })
        .filter(Boolean);

      return {
        question: question,
        questionRaw: question,
        columnIndex: colIdx,
        responses: responses,
        responseCount: responses.length,
        summary: responses.length
          ? '<p>' + responses.length + ' responses received.</p>'
          : '<p>No responses.</p>',
        summaryRaw: responses.length + ' responses received.'
      };
    }).filter(function (c) { return c.responseCount > 0; });
  }

  function linesForComment(str) {
    if (!str) return 0;
    var len = str.toString().length;
    return Math.max(1, Math.ceil(len / COMMENT_CHARS_PER_LINE));
  }

  var RETENTION_PAIRS = [
    { grouping: 'Hybrid working',       leavingCol: 147, stayingCol: 165 },
    { grouping: 'My job arrangements',  leavingCol: 148, stayingCol: 166 },
    { grouping: 'My career',            leavingCol: 149, stayingCol: 167 },
    { grouping: 'My desire for change', leavingCol: 150, stayingCol: 168 },
    { grouping: 'My manager',           leavingCol: 151, stayingCol: 169 },
    { grouping: 'My pay',               leavingCol: 152, stayingCol: 170 },
    { grouping: 'My recognition',       leavingCol: 153, stayingCol: 171 },
    { grouping: 'My wellbeing',         leavingCol: 155, stayingCol: 172 },
    { grouping: 'My work',              leavingCol: 156, stayingCol: 173 },
    { grouping: 'Other opportunities',  leavingCol: 157, stayingCol: 174 },
    { grouping: 'Having a voice',       leavingCol: 158, stayingCol: 175 },
    { grouping: 'The future',           leavingCol: 159, stayingCol: 176 },
    { grouping: 'Belonging',            leavingCol: 160, stayingCol: 177 }
  ];

  function stripGroupingPrefix(raw) {
    var text = (raw || '').toString().trim().replace(/\r\n|\n/g, ' ');
    var dashIdx = text.indexOf(' - ');
    return dashIdx !== -1 ? text.slice(dashIdx + 3).trim() : text;
  }

  function calculateRetentionComments(excelData) {
    var current = excelData.current;
    var rows = current.rows || [];
    var headers = current.questionHeaders || [];

    var sources = [
      { questionCol: 146, responseCol: 163 },
      { questionCol: 164, responseCol: 180 }
    ];

    return sources.map(function (src) {
      var question = cleanQuestionText(headers[src.questionCol]) || ('Comment col ' + src.responseCol);
      var responses = rows
        .map(function (r) { return r[src.responseCol]; })
        .filter(function (v) { return v !== null && v !== undefined && v !== ''; })
        .map(function (v) { return v.toString().trim(); })
        .filter(Boolean);
      return {
        question: question,
        questionRaw: question,
        columnIndex: src.responseCol,
        responses: responses,
        responseCount: responses.length,
        summary: '',
        summaryRaw: ''
      };
    }).filter(function (c) { return c.responseCount > 0; });
  }

  function calculateRetentionTableData(excelData) {
    var current = excelData.current;
    var rows = current.rows || [];
    var headers = current.questionHeaders || [];
    var n = rows.length;
    if (n === 0) return null;

    function countSelected(col) {
      return rows.filter(function (r) {
        var v = r[col];
        return v !== null && v !== undefined && v !== '' && String(v).trim() !== '';
      }).length;
    }

    var tableRows = RETENTION_PAIRS.map(function (pair) {
      return {
        grouping: pair.grouping + ':',
        leavingStatement:  stripGroupingPrefix(headers[pair.leavingCol]),
        leavingPercent:    Math.round((countSelected(pair.leavingCol)  / n) * 100),
        stayingStatement:  stripGroupingPrefix(headers[pair.stayingCol]),
        stayingPercent:    Math.round((countSelected(pair.stayingCol) / n) * 100)
      };
    });

    var question = (headers[146] || '').toString().trim().replace(/\r\n|\n/g, ' ')
      || 'Reasons selected why you may consider leaving as well as what leads you to stay (select up to 3 answers)';

    return {
      title: 'Retention',
      question: question,
      rows: tableRows,
      sampleSize: n
    };
  }

  function calculateManagementTableData(excelData) {
    var current = excelData.current;
    var rows = current.rows || [];
    var headers = current.questionHeaders || [];
    var n = rows.length;
    if (n === 0) return null;

    var GREAT_JOB_OPTIONS = [64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81];
    var DO_MORE_OPTIONS   = [83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100];

    function countSelected(col) {
      return rows.filter(function (r) {
        var v = r[col];
        return v !== null && v !== undefined && v !== '' && String(v).trim() !== '';
      }).length;
    }

    var tableRows = GREAT_JOB_OPTIONS.map(function (col, i) {
      var statement = (headers[col] || '').toString().trim().replace(/\r\n|\n/g, ' ') || ('Option ' + col);
      var col1Pct = Math.round((countSelected(col) / n) * 100);
      var col2Pct = Math.round((countSelected(DO_MORE_OPTIONS[i]) / n) * 100);
      return { statement: statement, col1Percent: col1Pct, col2Percent: col2Pct };
    });

    var doMoreQuestion = (headers[82] || '').toString().trim();

    return {
      title: 'Management',
      question: 'What is your direct line manager doing a great job of as well as what would you like to see your direct line manager do more of in the future? (select a maximum of 3 answers)',
      col1Header: 'What is your direct line manager doing a great job of?',
      col2Header: doMoreQuestion || 'What would you like to see your direct line manager do more of in future?',
      rows: tableRows,
      sampleSize: n
    };
  }

  function calculateRskGroupData(excelData) {
    var current = excelData.current;
    var rows = current.rows || [];
    var headers = current.questionHeaders || [];
    var n = rows.length;
    if (n === 0) return null;

    var RSK_COL = 32;
    var question = (headers[RSK_COL] || 'I am comfortable being a part of the RSK Group').toString().trim();

    var yesCount = 0;
    var noCount  = 0;
    rows.forEach(function (r) {
      var v = (r[RSK_COL] == null) ? '' : String(r[RSK_COL]).trim().toLowerCase();
      if (v === 'yes' || v === '1' || v === 'true') yesCount++;
      else if (v === 'no' || v === '0' || v === 'false') noCount++;
    });

    return {
      title: 'Brand Affinity',
      question: question,
      yesPercent: Math.round((yesCount / n) * 100),
      noPercent:  Math.round((noCount  / n) * 100),
      sampleSize: n
    };
  }

  function calculateBrandAffinityUgrData(excelData) {
    var current = excelData.current;
    var rows = current.rows || [];
    var headers = current.questionHeaders || [];
    var n = rows.length;
    if (n === 0) return null;

    function countSelected(rows, col) {
      return rows.filter(function (r) {
        var v = r[col];
        return v !== null && v !== undefined && v !== '' && String(v).trim() !== '';
      }).length;
    }

    function buildUgrSection(questionCol, optionCols) {
      var question = (headers[questionCol] || '').toString().trim();
      var optionRows = optionCols.map(function (col) {
        var label = (headers[col] || '').toString().trim() || 'Option ' + col;
        var count = countSelected(rows, col);
        var pct = Math.round((count / n) * 100);
        return { option: label, percent: pct };
      });
      return { question: question, rows: optionRows };
    }

    var internalUgr = buildUgrSection(20, [21, 22, 23, 24, 25]);
    var externalUgr = buildUgrSection(26, [27, 28, 29, 30, 31]);

    return {
      title: 'Brand Affinity',
      internalUgr: internalUgr,
      externalUgr: externalUgr,
      sampleSize: n
    };
  }

  function paginateCommentResponses(commentQuestions) {
    var pages = [];
    commentQuestions.forEach(function (q) {
      var responses = q.responses || [];
      if (!responses.length) return;

      var currentPage = [];
      var currentLines = 0;
      var pageIndex = 0;

      responses.forEach(function (resp) {
        var lines = linesForComment(resp);
        if (currentPage.length > 0 && currentLines + lines > COMMENT_MAX_LINES_PER_SLIDE) {
          pages.push({ question: q.question, questionRaw: q.questionRaw, responseCount: q.responseCount, responses: currentPage, isContinuation: pageIndex > 0 });
          pageIndex++;
          currentPage = [];
          currentLines = 0;
        }
        currentPage.push(resp);
        currentLines += lines;
      });

      if (currentPage.length) {
        pages.push({ question: q.question, questionRaw: q.questionRaw, responseCount: q.responseCount, responses: currentPage, isContinuation: pageIndex > 0 });
      }
    });
    return pages;
  }

  // ── Filter dimensions (lightweight extraction for upload UI) ─────────────

  var FILTER_DIMENSIONS = [
    { key: 'practice', label: 'Practice', col: COL.PRACTICE },
    { key: 'location', label: 'Location', col: COL.LOCATION }
  ];

  function getFilterDimensions(workbook) {
    if (!workbook || !workbook.SheetNames || !workbook.SheetNames.length) return [];

    var yearSheets = workbook.SheetNames.filter(function (n) { return /^\d{4}$/.test(n.trim()); });
    if (!yearSheets.length) return [];

    yearSheets.sort(function (a, b) { return parseInt(b) - parseInt(a); });
    var sheet = workbook.Sheets[yearSheets[0]];
    if (!sheet) return [];

    var json = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    if (!json || json.length < 5) return [];

    var dataStartRow = detectDataStartRow(json);
    var rows = json.slice(dataStartRow).filter(function (row) {
      return Array.isArray(row) && row.some(function (cell) { return cell !== undefined && cell !== ''; });
    });

    return FILTER_DIMENSIONS.map(function (dim) {
      var seen = {};
      rows.forEach(function (row) {
        var val = (row[dim.col] ?? '').toString().trim();
        if (val) seen[val] = true;
      });
      return { key: dim.key, label: dim.label, col: dim.col, values: Object.keys(seen).sort() };
    });
  }

  // ── validateAndParseWorkbook ──────────────────────────────────────────────

  function validateAndParseWorkbook(workbook) {
    return new Promise(function (resolve, reject) {
      try {
        if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
          return reject(new Error('Excel file contains no sheets.'));
        }

        var yearSheets = workbook.SheetNames.filter(function (n) { return /^\d{4}$/.test(n.trim()); });
        if (yearSheets.length === 0) {
          return reject(new Error(
            'No year-named sheets found (expected "2026", "2024", etc.). Found: ' + workbook.SheetNames.join(', ')
          ));
        }

        yearSheets.sort(function (a, b) { return parseInt(b) - parseInt(a); });
        var currentSheetName  = yearSheets[0];
        var previousSheetName = yearSheets.length > 1 ? yearSheets[1] : null;

        function parseSheet(sheetName) {
          var sheet = workbook.Sheets[sheetName];
          if (!sheet) return null;

          var json = XLSX.utils.sheet_to_json(sheet, { header: 1 });
          if (!json || json.length < 5) {
            throw new Error('Sheet "' + sheetName + '" has too few rows (' + json.length + '). Expected at least 5.');
          }

          var dataStartRow     = detectDataStartRow(json);
          var questionNumbers  = json[0] || [];
          var groupHeaders     = json[1] || [];
          var dimensionHeaders = json[2] || [];
          var questionHeaders  = json[3] || [];

          var rows = json.slice(dataStartRow).filter(function (row) {
            return Array.isArray(row) && row.some(function (cell) { return cell !== undefined && cell !== ''; });
          });

          if (rows.length === 0) {
            throw new Error('Sheet "' + sheetName + '" contains no response rows.');
          }

          if (!rows[0] || rows[0].length < 15) {
            throw new Error(
              'Sheet "' + sheetName + '" rows appear too short. ' +
              'Expected at least 15 columns, got ' + (rows[0] ? rows[0].length : 0) + '.'
            );
          }

          return {
            questionNumbers: questionNumbers,
            groupHeaders: groupHeaders,
            dimensionHeaders: dimensionHeaders,
            questionHeaders: questionHeaders,
            headers: questionHeaders,
            rows: rows,
            totalResponses: rows.length,
            sheetName: sheetName,
            sheetIndex: workbook.SheetNames.indexOf(sheetName)
          };
        }

        var currentData;
        try { currentData = parseSheet(currentSheetName); }
        catch (err) { return reject(err); }
        if (!currentData) return reject(new Error('Failed to parse sheet "' + currentSheetName + '".'));

        var previousData = null;
        if (previousSheetName) {
          try { previousData = parseSheet(previousSheetName); }
          catch (err) { console.warn('Previous-year sheet parse warning:', err.message); }
        }

        var allYears = [{ year: currentSheetName, data: currentData }];
        for (var i = 1; i < yearSheets.length; i++) {
          var name = yearSheets[i];
          try {
            var parsed = (name === previousSheetName && previousData) ? previousData : parseSheet(name);
            if (parsed) allYears.push({ year: name, data: parsed });
          } catch (err) {
            console.warn('Sheet "' + name + '" parse warning:', err.message);
          }
        }

        resolve({
          current: currentData,
          previous: previousData,
          currentYearLabel: currentSheetName,
          previousYearLabel: previousSheetName || null,
          allYears: allYears
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  // ── buildSlides ───────────────────────────────────────────────────────────

  function buildSlides(generator, container, reportData) {
    var slideNumber   = 1;
    var dataSet       = reportData.data || {};
    var currentData   = dataSet.current;
    var previousData  = dataSet.previous;

    if (!currentData) {
      showToast('Current year data is missing. Please upload a valid Pegasys file.', 'error');
      return;
    }

    var hasPreviousData = Boolean(previousData && previousData.rows && previousData.rows.length);
    var allYears = dataSet.allYears || [];
    var allYearLabels = allYears.map(function (e) { return e.year; });

    if (!hasPreviousData) {
      showToast('Previous year sheet not found or empty. Showing current year only.', 'warning');
    }

    var theme = (window.ThemeRegistry && window.ThemeRegistry.getTheme && reportData.theme)
      ? window.ThemeRegistry.getTheme(reportData.theme) : null;
    var seriesColors = (theme && theme.charts && theme.charts.seriesColors) || null;

    var coverSurveyName   = (theme && theme.cover && theme.cover.surveyName)   ? theme.cover.surveyName : reportData.surveyName;
    var coverDate          = (theme && theme.cover && theme.cover.date)          ? theme.cover.date : (typeof DataParser !== 'undefined' && DataParser.getCurrentDate ? DataParser.getCurrentDate() : '');
    var coverTextPlacement = (theme && theme.cover && theme.cover.textPlacement === 'left') ? 'left' : 'right';

    // 1. Cover
    generator.addSlide('cover', {
      surveyName: coverSurveyName,
      reportName: reportData.reportName,
      date: coverDate,
      textPlacement: coverTextPlacement
    }, container, { pageNumber: slideNumber++ });

    // 2. Report Methodology
    var methodologyInvitations = (theme && theme.methodology && theme.methodology.invitations) != null
      ? Number(theme.methodology.invitations)
      : null;
    var methodologyResponseRate = (methodologyInvitations > 0)
      ? Math.round((currentData.totalResponses / methodologyInvitations) * 100)
      : null;
    generator.addSlide('methodology', {
      title: 'Methodology',
      invitations: methodologyInvitations,
      uniqueResponses: currentData.totalResponses,
      responseRate: methodologyResponseRate
    }, container, { pageNumber: slideNumber++ });

    // 3. Engagement Model
    generator.addSlide('engagement-model', {
      title: 'Engagement Model'
    }, container, { pageNumber: slideNumber++ });

    // 4. Questions (paginated)
    try {
      var questionPages = paginateQuestions(dataSet);
      var pageTitles = ['Survey Questions'];
      for (var qi = 1; qi < questionPages.length; qi++) {
        pageTitles.push('Survey Questions (Page ' + (qi + 1) + ')');
      }
      questionPages.forEach(function (pageDimensions, pageIndex) {
        generator.addSlide('questions', {
          title: pageTitles[pageIndex],
          dimensions: pageDimensions
        }, container, { pageNumber: slideNumber++ });
      });
    } catch (err) {
      console.error('Questions slides failed:', err);
      showToast('Survey questions could not be generated: ' + err.message, 'error');
    }

    // 5. Bar Chart – main engagement categories (N-series)
    try {
      var barData = calculateBarChartData(dataSet);

      var barSeriesColors = seriesColors ? seriesColors.slice() : null;
      if (reportData.filteredData) {
        var filteredBarData = calculateBarChartData(reportData.filteredData);
        barData.series.push({
          label: 'Filtered Report',
          scores: filteredBarData.series[0].scores
        });
        if (!barSeriesColors) barSeriesColors = [];
        var filteredColor = (theme && theme.colors && theme.colors.filteredReport) || '#0197FA';
        barSeriesColors.push(filteredColor);
      }

      generator.addSlide('barchart', {
        title: 'Category Indexes',
        categories: barData.categories,
        series: barData.series,
        seriesColors: barSeriesColors
      }, container, { pageNumber: slideNumber++ });
    } catch (err) {
      console.error('Bar chart failed:', err);
      showToast('Bar chart could not be generated: ' + err.message, 'error');
    }

    // 6. Heatmap slides – one per demographic filter
    var heatmapConfigs = [
      { type: 'practice',    title: 'Engagement by Practice' },
      { type: 'location',    title: 'Engagement by Location' },
      { type: 'jobLevel',    title: 'Engagement by Job Level' },
      { type: 'age',         title: 'Engagement by Age' },
      { type: 'tenure',      title: 'Engagement by Tenure' },
      { type: 'gender',      title: 'Engagement by Gender' },
      { type: 'race',        title: 'Engagement by Race' }
    ];

    heatmapConfigs.forEach(function (config) {
      try {
        var hmData = calculateHeatmapData(dataSet, config.type, { showShiftIndicators: hasPreviousData });

        if (reportData.filteredData) {
          var filteredHm = calculateHeatmapData(reportData.filteredData, config.type, { showShiftIndicators: false });
          var filteredOverall = filteredHm.rows[0];
          var filteredRow = {
            name: 'Filtered Report',
            sampleSize: filteredOverall.sampleSize,
            scores: filteredOverall.scores,
            shifts: null,
            isOverall: false,
            isFiltered: true
          };
          hmData.rows.splice(1, 0, filteredRow);
        }

        generator.addSlide('pegasys-heatmap', {
          title: config.title,
          columnHeaders: hmData.columnHeaders,
          rowData: hmData.rows,
          showShiftIndicators: hasPreviousData
        }, container, { pageNumber: slideNumber++ });
      } catch (err) {
        console.error('Heatmap (' + config.type + ') failed:', err);
      }
    });

    // 7. Top & Bottom Statements (multi-year)
    try {
      var statementsData = calculateTopBottomStatements(dataSet, 5);
      generator.addSlide('top-bottom-statements', {
        title: 'Top & Bottom Scoring Statements',
        topStatements: statementsData.topStatements,
        bottomStatements: statementsData.bottomStatements,
        yearLabels: statementsData.yearLabels
      }, container, { pageNumber: slideNumber++ });
    } catch (err) {
      console.error('Top/bottom statements failed:', err);
      showToast('Top/bottom statements error: ' + err.message, 'error');
    }

    // 8. Horizontal bar chart per dimension (N-series + aggregate)
    var percentageSource = reportData.filteredData || dataSet;
    try {
      var dimData = calculateDimensionStatements(dataSet);
      dimData.dimensions.forEach(function (dim) {
        generator.addSlide('horizontal-barchart', {
          title: dim.name + ' \u2013 Statement Scores',
          dimensionName: dim.name,
          statements: dim.statements,
          yearLabels: dimData.yearLabels,
          seriesColors: seriesColors
        }, container, { pageNumber: slideNumber++ });

        if (dim.name === 'Retention') {
          try {
            var retentionData = calculateRetentionTableData(percentageSource);
            if (retentionData) {
              generator.addSlide('retention-table', retentionData, container, { pageNumber: slideNumber++ });
            }
          } catch (e) {
            console.warn('Retention table slide skipped:', e.message);
          }
          try {
            var retentionComments = calculateRetentionComments(percentageSource);
            var retentionCommentPages = paginateCommentResponses(retentionComments);
            retentionCommentPages.forEach(function (page) {
              var cleanPage = Object.assign({}, page, {
                questionRaw: (page.questionRaw || '').replace(/\s*\([^)]*\)\s*$/, '')
              });
              generator.addSlide('comments', {
                title: 'Retention',
                commentMode: 'dump',
                questions: [cleanPage]
              }, container, { pageNumber: slideNumber++ });
            });
          } catch (e) {
            console.warn('Retention comments skipped:', e.message);
          }
        }

        if (dim.name === 'Management') {
          try {
            var mgmtData = calculateManagementTableData(percentageSource);
            if (mgmtData) {
              generator.addSlide('dual-multiselect', mgmtData, container, { pageNumber: slideNumber++ });
            }
          } catch (e) {
            console.warn('Management table slide skipped:', e.message);
          }
        }

        if (dim.name === 'Brand Affinity') {
          try {
            var ugrData = calculateBrandAffinityUgrData(percentageSource);
            if (ugrData && ugrData.internalUgr && ugrData.externalUgr) {
              generator.addSlide('brand-affinity', ugrData, container, { pageNumber: slideNumber++ });
            }
          } catch (e) {
            console.warn('Brand Affinity UGR slide skipped:', e.message);
          }
          try {
            var rskData = calculateRskGroupData(percentageSource);
            if (rskData) {
              generator.addSlide('yes-no-chart', rskData, container, { pageNumber: slideNumber++ });
            }
          } catch (e) {
            console.warn('RSK Group slide skipped:', e.message);
          }
        }
      });
    } catch (err) {
      console.error('Dimension statements failed:', err);
      showToast('Dimension statement slides error: ' + err.message, 'error');
    }

    // 9. eNPS Table
    try {
      var enpsData = calculateEnpsTableData(dataSet, 'practice');

      var enpsFilteredRow = null;
      if (reportData.filteredData) {
        var filteredEnps = calculateEnpsTableData(reportData.filteredData, 'practice');
        enpsFilteredRow = Object.assign({}, filteredEnps.overallRow, { label: 'Filtered Report' });
      }

      generator.addSlide('enps-table', {
        title: 'Employee Net Promoter Score (eNPS)',
        question: enpsData.question,
        overallRow: enpsData.overallRow,
        filteredRow: enpsFilteredRow,
        breakdownRows: enpsData.breakdownRows,
        yearLabels: enpsData.yearLabels
      }, container, { pageNumber: slideNumber++ });
    } catch (err) {
      console.error('eNPS table failed:', err);
      showToast('eNPS slide error: ' + err.message, 'error');
    }

    // 10. Comments (paginated dump)
    try {
      var commentsData = calculateComments(percentageSource);
      var commentPages = paginateCommentResponses(commentsData);
      commentPages.forEach(function (page) {
        generator.addSlide('comments', {
          title: 'Comments',
          commentMode: 'dump',
          questions: [page]
        }, container, { pageNumber: slideNumber++ });
      });
    } catch (err) {
      console.error('Comments failed:', err);
    }
  }

  // ── Register ──────────────────────────────────────────────────────────────

  if (window.ProfileRegistry) {
    window.ProfileRegistry.register('pegasys', {
      validateAndParseWorkbook: validateAndParseWorkbook,
      buildSlides: buildSlides,
      getFilterDimensions: getFilterDimensions,
      commentMode: 'dump'
    });
  }
})();
