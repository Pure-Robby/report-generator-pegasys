/**
 * Seacom profile: data mapping and slide pipeline for Seacom (client one).
 */
(function () {
  function validateAndParseWorkbook(workbook) {
    return new Promise((resolve, reject) => {
      try {
        if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
          reject(new Error('Excel file contains no sheets'));
          return;
        }

        const processSheet = (sheetIndex, { required = false } = {}) => {
          const sheetName = workbook.SheetNames[sheetIndex];
          if (!sheetName) return null;

          const sheet = workbook.Sheets[sheetName];
          if (!sheet) return null;

          const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
          if (!jsonData || jsonData.length === 0) {
            return null;
          }

          const fail = (message) => {
            if (required) {
              throw new Error(message);
            }
            return null;
          };

          if (jsonData.length < 2) {
            return fail(
              `Sheet "${sheetName}" is missing required rows. ` +
              'Expected: Row 1 (grouping, optional), Row 2 (headers, required), Row 3+ (responses, required).'
            );
          }

          const groupHeaders = Array.isArray(jsonData[0]) ? jsonData[0] : [];
          const headers = Array.isArray(jsonData[1]) ? jsonData[1] : [];
          const rows = jsonData
            .slice(2)
            .filter(row => Array.isArray(row) && row.some(cell => cell !== undefined && cell !== ''));

          const normalize = (value) => (value ?? '').toString().trim().toLowerCase();

          const expectedHeaderChecks = [
            { index: 0, contains: 'code', label: 'code' },
            { index: 1, contains: 'department', label: 'department' },
            { index: 2, contains: 'cost', label: 'cost centre' },
            { index: 3, contains: 'location', label: 'location' }
          ];

          const headerLooksValid = expectedHeaderChecks.every(check => {
            const cell = headers[check.index];
            return normalize(cell).includes(check.contains);
          });

          if (!headers.length) {
            return fail(
              `Sheet "${sheetName}" header row is missing. ` +
              'Expected headers in Excel Row 2 (e.g. "code", "department", "cost centre", "location").'
            );
          }

          if (!headerLooksValid) {
            const headerPreview = headers
              .slice(0, 6)
              .map(v => (v ?? '').toString().trim())
              .filter(Boolean)
              .join(', ') || '(empty)';

            return fail(
              `Sheet "${sheetName}" does not appear to have the expected headers in Excel Row 2. ` +
              `The first columns should include: code, department, cost centre, location. ` +
              `Detected header preview: ${headerPreview}`
            );
          }

          if (!rows.length) {
            return fail(
              `Sheet "${sheetName}" contains no response rows. ` +
              'Expected responses starting in Excel Row 3.'
            );
          }

          return {
            groupHeaders,
            headers,
            rows,
            totalResponses: rows.length,
            sheetName,
            sheetIndex
          };
        };

        let currentData;
        try {
          currentData = processSheet(0, { required: true });
        } catch (err) {
          reject(err);
          return;
        }

        const previousData = workbook.SheetNames.length > 1 ? processSheet(1) : null;

        resolve({
          current: currentData,
          previous: previousData,
          currentYearLabel: '2025',
          previousYearLabel: previousData ? '2024' : null
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  function buildSlides(generator, container, reportData) {
    let slideNumber = 1;
    const dataSet = reportData.data || {};
    const currentData = dataSet.current;
    const previousData = dataSet.previous;

    if (!currentData) {
      showToast('Current year data is missing. Please upload a valid Sheet 1.', 'error');
      return;
    }

    const hasPreviousData = Boolean(previousData && previousData.rows && previousData.rows.length);
    const yearLabels = {
      current: generator.getYearLabel(dataSet.currentYearLabel, '2025'),
      previous: hasPreviousData ? generator.getYearLabel(dataSet.previousYearLabel, '2024') : null
    };

    if (!hasPreviousData) {
      showToast('Previous year sheet not found or empty. Showing current year only.', 'warning');
    }

    const theme = (window.ThemeRegistry && window.ThemeRegistry.getTheme && reportData.theme)
      ? window.ThemeRegistry.getTheme(reportData.theme) : null;
    const coverSurveyName = (theme && theme.cover && theme.cover.surveyName)
      ? theme.cover.surveyName
      : reportData.surveyName;
    const coverDate = (theme && theme.cover && theme.cover.date)
      ? theme.cover.date
      : DataParser.getCurrentDate();
    const coverTextPlacement = (theme && theme.cover && theme.cover.textPlacement === 'left')
      ? 'left'
      : 'right';

    generator.addSlide('cover', {
      surveyName: coverSurveyName,
      reportName: reportData.reportName,
      date: coverDate,
      textPlacement: coverTextPlacement
    }, container, { pageNumber: slideNumber++ });

    generator.addSlide('methodology', {
      title: 'Methodology',
      uniqueResponses: currentData.totalResponses,
      totalHeadcount: 444,
      responseRate: Math.round((currentData.totalResponses / 444) * 100)
    }, container, { pageNumber: slideNumber++ });

    generator.addSlide('engagement-model', {
      title: 'Engagement Model',
    }, container, { pageNumber: slideNumber++ });

    generator.addSlide('divider', {
      title: 'Engagement Dimension Scores',
    }, container, { pageNumber: slideNumber++ });

    try {
      const locationData = DataCalculations.calculateSatisfactionData(reportData.data, 'location');
      generator.addSlide('satisfaction', {
        title: 'Satisfaction - Location',
        dimension: 'location',
        currentData: locationData.current,
        previousData: locationData.previous,
        mergedBreakdown: locationData.mergedBreakdown,
        yearLabels
      }, container, { pageNumber: slideNumber++ });

      const costCenterData = DataCalculations.calculateSatisfactionData(reportData.data, 'costCenter');
      generator.addSlide('satisfaction', {
        title: 'Satisfaction - Cost Center',
        dimension: 'costCenter',
        currentData: costCenterData.current,
        previousData: costCenterData.previous,
        mergedBreakdown: costCenterData.mergedBreakdown,
        yearLabels
      }, container, { pageNumber: slideNumber++ });

      const departmentData = DataCalculations.calculateSatisfactionData(reportData.data, 'department');
      const maxRowsPerSlide = 13;
      const departmentBreakdown = departmentData.mergedBreakdown || [];

      if (departmentBreakdown.length <= maxRowsPerSlide - 1) {
        generator.addSlide('satisfaction', {
          title: 'Satisfaction - Department',
          dimension: 'department',
          currentData: departmentData.current,
          previousData: departmentData.previous,
          mergedBreakdown: departmentBreakdown,
          maxRows: maxRowsPerSlide,
          yearLabels
        }, container, { pageNumber: slideNumber++ });
      } else {
        const firstPageRows = maxRowsPerSlide - 1;
        generator.addSlide('satisfaction', {
          title: 'Satisfaction - Department',
          dimension: 'department',
          currentData: departmentData.current,
          previousData: departmentData.previous,
          mergedBreakdown: departmentBreakdown,
          startIndex: 0,
          maxRows: maxRowsPerSlide,
          yearLabels
        }, container, { pageNumber: slideNumber++ });
        generator.addSlide('satisfaction', {
          title: 'Satisfaction - Department (Continued)',
          dimension: 'department',
          currentData: departmentData.current,
          previousData: departmentData.previous,
          mergedBreakdown: departmentBreakdown,
          startIndex: firstPageRows,
          maxRows: maxRowsPerSlide,
          yearLabels
        }, container, { pageNumber: slideNumber++ });
      }
    } catch (error) {
      console.error('Failed to generate satisfaction slides:', error);
      showToast(error.message, 'error');
    }

    try {
      const questionPages = DataCalculations.paginateSurveyQuestions(reportData.data);
      const pageTitles = [
        'Survey Questions',
        'Survey Questions (Page 2)',
        'Survey Questions (Page 3)'
      ];
      questionPages.forEach((pageDimensions, pageIndex) => {
        const slideOptions = { pageNumber: slideNumber++ };
        if (pageIndex === 2) {
          slideOptions.slideClass = 'questions-slide-page-3';
          slideOptions.extraCompact = true;
        }
        generator.addSlide('questions', {
          title: pageTitles[pageIndex] || 'Survey Questions',
          dimensions: pageDimensions
        }, container, slideOptions);
      });
    } catch (error) {
      console.error('Failed to generate questions slides:', error);
      showToast(`Survey questions could not be generated: ${error.message}`, 'error');
    }

    try {
      const barChartData = DataCalculations.calculateEngagementIndexScores(reportData.data);
      generator.addSlide('barchart', {
        title: 'Engagement Index Scores',
        categories: barChartData.categories,
        current: barChartData.currentYear.scores,
        previous: barChartData.previousYear ? barChartData.previousYear.scores : null,
        currentLabel: barChartData.currentYear.label,
        previousLabel: barChartData.previousYear ? barChartData.previousYear.label : null
      }, container, { pageNumber: slideNumber++ });
    } catch (error) {
      console.error('Failed to generate bar chart:', error);
      showToast(error.message, 'error');
    }

    try {
      const engagementStatementsData = DataCalculations.calculateTopBottomStatements(reportData.data, 'engagement');
      generator.addSlide('top-bottom-statements', {
        title: 'Top & Bottom Scoring Statements - Engagement',
        topStatements: engagementStatementsData.topStatements,
        bottomStatements: engagementStatementsData.bottomStatements,
        yearLabels: engagementStatementsData.yearLabels
      }, container, { pageNumber: slideNumber++ });
    } catch (error) {
      console.error('Failed to generate engagement top/bottom statements slide:', error);
      showToast(`Engagement statements error: ${error.message}`, 'error');
    }

    try {
      const seacomChartData = DataCalculations.calculateSeacomDimensionScores(reportData.data);
      generator.addSlide('barchart', {
        title: 'SEACOM Index & Dimension Scores',
        categories: seacomChartData.categories,
        current: seacomChartData.currentYear.scores,
        previous: seacomChartData.previousYear ? seacomChartData.previousYear.scores : null,
        currentLabel: seacomChartData.currentYear.label,
        previousLabel: seacomChartData.previousYear ? seacomChartData.previousYear.label : null
      }, container, { pageNumber: slideNumber++ });
    } catch (error) {
      console.error('Failed to generate SEACOM dimension bar chart:', error);
      showToast(error.message, 'error');
    }

    try {
      const seacomStatementsData = DataCalculations.calculateTopBottomStatements(reportData.data, 'seacom');
      generator.addSlide('top-bottom-statements', {
        title: 'Top & Bottom Scoring Statements - SEACOM',
        topStatements: seacomStatementsData.topStatements,
        bottomStatements: seacomStatementsData.bottomStatements,
        yearLabels: seacomStatementsData.yearLabels
      }, container, { pageNumber: slideNumber++ });
    } catch (error) {
      console.error('Failed to generate SEACOM top/bottom statements slide:', error);
      showToast(`SEACOM statements error: ${error.message}`, 'error');
    }

    generator.addSlide('divider', {
      title: 'Heatmap Slides',
    }, container, { pageNumber: slideNumber++ });

    try {
      const locationHeatmapData = DataCalculations.calculateHeatMapData(
        { current: currentData, previous: previousData },
        'location',
        { showShiftIndicators: hasPreviousData }
      );
      generator.addSlide('heatmap', {
        title: 'Engagement by Location',
        breakdownType: 'location',
        rowData: locationHeatmapData,
        showShiftIndicators: hasPreviousData
      }, container, { pageNumber: slideNumber++ });

      const costCentreHeatmapData = DataCalculations.calculateHeatMapData(
        { current: currentData, previous: previousData },
        'costCentre',
        { showShiftIndicators: hasPreviousData }
      );
      generator.addSlide('heatmap', {
        title: 'Engagement by Cost Centre',
        breakdownType: 'costCentre',
        rowData: costCentreHeatmapData,
        showShiftIndicators: hasPreviousData
      }, container, { pageNumber: slideNumber++ });

      const departmentHeatmapData = DataCalculations.calculateHeatMapData(
        { current: currentData, previous: previousData },
        'department',
        { showShiftIndicators: hasPreviousData }
      );
      const overallDepartmentRow = departmentHeatmapData.find(row => row.isOverall) || null;
      const departmentRows = departmentHeatmapData.filter(row => !row.isOverall);
      const maxHeatmapRowsPerSlide = 9;
      const departmentRowsPerPage = maxHeatmapRowsPerSlide - 1;

      if (departmentRows.length <= departmentRowsPerPage) {
        const singlePageRows = overallDepartmentRow
          ? [overallDepartmentRow, ...departmentRows]
          : departmentRows;
        generator.addSlide('heatmap', {
          title: 'Engagement by Department',
          breakdownType: 'department',
          rowData: singlePageRows,
          showShiftIndicators: hasPreviousData
        }, container, { pageNumber: slideNumber++ });
      } else {
        const totalPages = Math.ceil(departmentRows.length / departmentRowsPerPage);
        for (let page = 0; page < totalPages; page++) {
          const startIdx = page * departmentRowsPerPage;
          const endIdx = Math.min((page + 1) * departmentRowsPerPage, departmentRows.length);
          const chunk = departmentRows.slice(startIdx, endIdx);
          const pageData = overallDepartmentRow ? [overallDepartmentRow, ...chunk] : chunk;
          generator.addSlide('heatmap', {
            title: `Engagement by Department ${totalPages > 1 ? `(${page + 1}/${totalPages})` : ''}`,
            breakdownType: 'department',
            rowData: pageData,
            showShiftIndicators: hasPreviousData
          }, container, { pageNumber: slideNumber++ });
        }
      }

      try {
        const genderData = DataCalculations.calculateHeatMapData(
          { current: currentData, previous: previousData },
          'gender',
          { showShiftIndicators: hasPreviousData }
        );
        const raceData = DataCalculations.calculateHeatMapData(
          { current: currentData, previous: previousData },
          'race',
          { showShiftIndicators: hasPreviousData }
        );
        generator.addSlide('heatmap', {
          title: 'Engagement by Demographics - Gender & Race',
          breakdownType: 'demographics-gender-race',
          rowData: [],
          subTables: [
            { subtitle: 'Gender', rowData: genderData },
            { subtitle: 'Race', rowData: raceData }
          ],
          showShiftIndicators: hasPreviousData
        }, container, { pageNumber: slideNumber++ });
      } catch (err) {
        console.warn('Demographics (Gender/Race) slide skipped:', err.message);
      }

      try {
        const ageData = DataCalculations.calculateHeatMapData(
          { current: currentData, previous: previousData },
          'age',
          { showShiftIndicators: hasPreviousData }
        );
        const tenureData = DataCalculations.calculateHeatMapData(
          { current: currentData, previous: previousData },
          'tenure',
          { showShiftIndicators: hasPreviousData }
        );
        generator.addSlide('heatmap', {
          title: 'Engagement by Demographics - Age & Tenure',
          breakdownType: 'demographics-age-tenure',
          rowData: [],
          subTables: [
            { subtitle: 'Age', rowData: ageData },
            { subtitle: 'Tenure', rowData: tenureData }
          ],
          showShiftIndicators: hasPreviousData
        }, container, { pageNumber: slideNumber++ });
      } catch (err) {
        console.warn('Demographics (Age/Tenure) slide skipped:', err.message);
      }
    } catch (error) {
      console.error('Failed to generate heatmap slides:', error);
      showToast(`Heatmap slides error: ${error.message}`, 'error');
    }

    generator.addSlide('divider', {
      title: 'Seacom Index Statement Scores',
    }, container, { pageNumber: slideNumber++ });

    try {
      const seacomDimensionData = DataCalculations.calculateSeacomDimensionStatements(reportData.data);
      seacomDimensionData.dimensions.forEach(dimension => {
        generator.addSlide('horizontal-barchart', {
          title: `${dimension.name} - Statement Scores`,
          dimensionName: dimension.name,
          statements: dimension.statements,
          yearLabels: seacomDimensionData.yearLabels
        }, container, { pageNumber: slideNumber++ });
      });
    } catch (error) {
      console.error('Failed to generate SEACOM dimension horizontal bar charts:', error);
      showToast(`SEACOM dimension charts error: ${error.message}`, 'error');
    }

    try {
      const tenPointScaleData = DataCalculations.calculateTenPointScaleDistribution(reportData.data);
      tenPointScaleData.distributions.forEach(dist => {
        generator.addSlide('ten-point-scale-chart', {
          title: 'Diversity & Inclusion - Statement Scores',
          questionText: dist.questionText,
          distribution: dist.currentDistribution,
          previousDistribution: dist.previousDistribution,
          yearLabels: tenPointScaleData.yearLabels
        }, container, { pageNumber: slideNumber++ });
      });
    } catch (error) {
      console.error('Failed to generate 10-point scale distribution charts:', error);
      showToast(`10-point scale charts error: ${error.message}`, 'error');
    }

    generator.addSlide('divider', {
      title: 'Retention Risk',
    }, container, { pageNumber: slideNumber++ });

    const retentionQuestions = DataCalculations.getRetentionQuestionTexts(reportData.data);
    generator.addSlide('retention-intro', {
      title: 'Retention Risk',
      description: 'Statements with subsequent agreement factors that made use of a 5 point scale, which were inverted to reflect the overall Retention Risk Index.',
      questions: [
        { dimension: 'Risk 1', question: retentionQuestions.risk1 },
        { dimension: 'Risk 2', question: retentionQuestions.risk2 }
      ]
    }, container, { pageNumber: slideNumber++ });

    try {
      const riskSlideConfigs = [
        { type: 'location', title: 'Retention Risk - Location', entityLabel: 'Location' },
        { type: 'costCentre', title: 'Retention Risk - Cost Centre', entityLabel: 'Cost Centre' },
        { type: 'department', title: 'Retention Risk - Department', entityLabel: 'Department', paginate: true }
      ];
      const maxRowsPerRiskSlide = 13;

      riskSlideConfigs.forEach(config => {
        const rows = DataCalculations.calculateRetentionRiskByDimension(reportData.data, config.type);
        if (!rows || !rows.length) return;

        if (config.paginate && rows.length > maxRowsPerRiskSlide) {
          const overallRow = rows.find(row => row.isOverall) || null;
          const detailRows = rows.filter(row => !row.isOverall);
          const detailRowsPerPage = overallRow ? maxRowsPerRiskSlide - 1 : maxRowsPerRiskSlide;
          const totalPages = Math.ceil(detailRows.length / detailRowsPerPage);

          for (let page = 0; page < totalPages; page++) {
            const startIdx = page * detailRowsPerPage;
            const chunk = detailRows.slice(startIdx, startIdx + detailRowsPerPage);
            const slideRows = overallRow ? [overallRow, ...chunk] : chunk;
            const pageTitle = totalPages > 1
              ? `${config.title} (${page + 1}/${totalPages})`
              : config.title;
            generator.addSlide('risk-matrix', {
              title: pageTitle,
              rows: slideRows,
              entityLabel: config.entityLabel,
              riskDefinitions: true
            }, container, { pageNumber: slideNumber++ });
          }
        } else {
          generator.addSlide('risk-matrix', {
            title: config.title,
            rows,
            entityLabel: config.entityLabel,
            riskDefinitions: true
          }, container, { pageNumber: slideNumber++ });
        }
      });
    } catch (error) {
      console.error('Failed to generate retention risk slides:', error);
      showToast(`Retention risk slides error: ${error.message}`, 'error');
    }

    generator.addSlide('divider', {
      title: 'Employee Net Promoter Score (eNPS)',
    }, container, { pageNumber: slideNumber++ });

    generator.addSlide('enps-intro', {
      title: 'eNPS'
    }, container, { pageNumber: slideNumber++ });

    try {
      const enpsConfigs = [
        { type: 'location', label: 'Location' },
        { type: 'costCentre', label: 'Cost Centre' },
        { type: 'department', label: 'Department' }
      ];
      const maxRowsPerEnpsSlide = 10;

      enpsConfigs.forEach(config => {
        const enpsData = DataCalculations.calculateEnpsByDimension(reportData.data, config.type);
        const overallRow = enpsData.overall;
        const detailRows = enpsData.rows;
        const rowsPerPage = Math.max(1, maxRowsPerEnpsSlide - 1);
        const totalPages = Math.max(1, Math.ceil(detailRows.length / rowsPerPage) || 1);

        for (let page = 0; page < totalPages; page++) {
          const startIdx = page * rowsPerPage;
          const chunk = detailRows.slice(startIdx, startIdx + rowsPerPage);
          const tableRows = [overallRow, ...chunk];
          const title = totalPages > 1
            ? `eNPS - ${config.label} (${page + 1}/${totalPages})`
            : `eNPS - ${config.label}`;
          generator.addSlide('enps', {
            title,
            questionText: enpsData.questionText,
            chartData: {
              detractorsPct: overallRow.detractorsPctExact,
              passivesPct: overallRow.passivesPctExact,
              promotersPct: overallRow.promotersPctExact,
              yearLabel: enpsData.yearLabel
            },
            rows: tableRows
          }, container, { pageNumber: slideNumber++ });
        }
      });
    } catch (error) {
      console.error('Failed to generate eNPS slides:', error);
      showToast(`eNPS slides error: ${error.message}`, 'error');
    }

    generator.addSlide('divider', {
      title: 'Employee Comments',
    }, container, { pageNumber: slideNumber++ });

    try {
      const commentsData = DataCalculations.calculateCommentSummaries(reportData.data);
      const questionsPerSlide = 2;
      const totalPages = Math.max(1, Math.ceil(commentsData.length / questionsPerSlide));

      for (let page = 0; page < totalPages; page++) {
        const startIdx = page * questionsPerSlide;
        const chunk = commentsData.slice(startIdx, startIdx + questionsPerSlide);
        if (!chunk.length) continue;

        const title = totalPages > 1
          ? `Comments Summary (${page + 1}/${totalPages})`
          : 'Comments Summary';

        generator.addSlide('comments', {
          title,
          questions: chunk
        }, container, { pageNumber: slideNumber++ });
      }
    } catch (error) {
      console.error('Failed to generate comments slides:', error);
      showToast(`Comments slides error: ${error.message}`, 'error');
    }

    generator.addSlide('divider', {
      title: 'Thank You',
    }, container, { pageNumber: slideNumber++ });
  }

  if (window.ProfileRegistry) {
    window.ProfileRegistry.register('seacom', { validateAndParseWorkbook, buildSlides, commentMode: 'summary' });
  }
})();
