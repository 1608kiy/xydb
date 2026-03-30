
      function initReportChartsOnce() {
        if (window.__reportChartsInited) return;
        window.__reportChartsInited = true;
        if (!window.echarts) {
          console.warn('ECharts 加载失败，图表已降级为文本提示');
          ['task-trend-chart', 'category-pie-chart', 'focus-bar-chart', 'focus-heatmap'].forEach(function (id) {
            var el = document.getElementById(id);
            if (el) {
              el.innerHTML = '<div style="height:100%;display:flex;align-items:center;justify-content:center;color:#94a3b8;font-size:13px;">图表组件加载失败，请刷新重试</div>';
            }
          });
          return;
        }

        var taskTrendChartEl = document.getElementById('task-trend-chart');
        var categoryPieChartEl = document.getElementById('category-pie-chart');
        var focusBarChartEl = document.getElementById('focus-bar-chart');
        var focusHeatmapEl = document.getElementById('focus-heatmap');
        if (!taskTrendChartEl || !categoryPieChartEl || !focusBarChartEl || !focusHeatmapEl) {
          console.warn('图表容器缺失，跳过图表初始化');
          return;
        }

        var isDark = document.documentElement.classList.contains('unified-dark-mode');
        var chartTheme = isDark ? {
          axisLine: 'rgba(113, 122, 138, 0.42)',
          axisTick: 'rgba(113, 122, 138, 0.28)',
          axisText: '#B0B7C3',
          splitLine: 'rgba(45, 55, 72, 0.72)',
          tooltipBg: 'rgba(35, 43, 59, 0.95)',
          tooltipBorder: '#2D3748',
          tooltipText: '#F0F2F5',
          seriesMain: '#4A6CF7',
          seriesMainAreaTop: 'rgba(74, 108, 247, 0.28)',
          seriesMainAreaBottom: 'rgba(74, 108, 247, 0.04)',
          seriesBarTop: '#8B5CF6',
          seriesBarBottom: '#4A6CF7',
          heatAreaA: 'rgba(35, 43, 59, 0.65)',
          heatAreaB: 'rgba(26, 33, 48, 0.68)',
          heatLegendBg: 'rgba(35, 43, 59, 0.85)',
          heatLegendText: '#B0B7C3',
          heatRamp: ['#23314E', '#314B82', '#3B5EB6', '#4A6CF7', '#5D7EFF', '#7A95FF'],
          pieBorder: '#232B3B',
          pieLabel: 'rgba(240, 242, 245, 0.88)',
          pieWork: '#4A6CF7',
          pieStudy: '#8B5CF6',
          pieLife: '#EC4899',
          pieHealth: '#10B981'
        } : {
          axisLine: 'rgba(156, 163, 175, 0.5)',
          axisTick: 'rgba(156, 163, 175, 0.3)',
          axisText: '#374151',
          splitLine: 'rgba(209, 213, 219, 0.3)',
          tooltipBg: 'rgba(255, 255, 255, 0.95)',
          tooltipBorder: '#E5E7EB',
          tooltipText: '#1F2937',
          seriesMain: '#4F46E5',
          seriesMainAreaTop: 'rgba(79, 70, 229, 0.3)',
          seriesMainAreaBottom: 'rgba(79, 70, 229, 0.05)',
          seriesBarTop: '#7C3AED',
          seriesBarBottom: '#4F46E5',
          heatAreaA: 'rgba(255,255,255,0.3)',
          heatAreaB: 'rgba(243,244,246,0.3)',
          heatLegendBg: 'rgba(255,255,255,0.8)',
          heatLegendText: '#6B7280',
          heatRamp: ['#DBEAFE', '#93C5FD', '#60A5FA', '#3B82F6', '#2563EB', '#1D4ED8'],
          pieBorder: '#fff',
          pieLabel: 'rgba(31, 41, 55, 0.8)',
          pieWork: '#3B82F6',
          pieStudy: '#8B5CF6',
          pieLife: '#EC4899',
          pieHealth: '#10B981'
        };

        // 任务完成趋势图
        var taskTrendChart = echarts.init(taskTrendChartEl);
        window.taskTrendChart = taskTrendChart;
        taskTrendChart.setOption({
          xAxis: {
            type: 'category',
            data: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
            axisLine: { lineStyle: { color: chartTheme.axisLine } },
            axisTick: { lineStyle: { color: chartTheme.axisTick } },
            axisLabel: { 
              color: chartTheme.axisText,
              fontWeight: 500,
              fontSize: 12
            }
          },
          yAxis: {
            type: 'value',
            axisLine: { show: false },
            splitLine: { lineStyle: { color: chartTheme.splitLine } },
            axisLabel: {
              color: chartTheme.axisText,
              fontWeight: 500
            }
          },
          series: [{
            data: [3, 6, 4, 5, 7, 2, 1],
            type: 'line',
            smooth: true,
            lineStyle: {
              color: chartTheme.seriesMain,
              width: 3
            },
            itemStyle: {
              color: chartTheme.seriesMain,
              borderColor: chartTheme.pieBorder,
              borderWidth: 2
            },
            areaStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: chartTheme.seriesMainAreaTop },
                { offset: 1, color: chartTheme.seriesMainAreaBottom }
              ])
            }
          }]
        });

        // 任务分类统计饼图
        var categoryPieChart = echarts.init(categoryPieChartEl);
        window.categoryPieChart = categoryPieChart;
        categoryPieChart.setOption({
          series: [{
            type: 'pie',
            radius: ['40%', '70%'],
            center: ['50%', '50%'],
            itemStyle: {
              borderRadius: 8,
              borderColor: chartTheme.pieBorder,
              borderWidth: 2
            },
            label: {
              color: chartTheme.pieLabel
            },
            data: [
              { value: 12, name: '工作', itemStyle: { color: chartTheme.pieWork } },
              { value: 8, name: '学习', itemStyle: { color: chartTheme.pieStudy } },
              { value: 5, name: '生活', itemStyle: { color: chartTheme.pieLife } },
              { value: 3, name: '健康', itemStyle: { color: chartTheme.pieHealth } }
            ]
          }]
        });

        // 番茄专注分析柱状图
        var focusBarChart = echarts.init(focusBarChartEl);
        window.focusBarChart = focusBarChart;
        focusBarChart.setOption({
          xAxis: {
            type: 'category',
            data: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
            axisLine: { lineStyle: { color: chartTheme.axisLine } },
            axisTick: { lineStyle: { color: chartTheme.axisTick } },
            axisLabel: { 
              color: chartTheme.axisText,
              fontWeight: 500,
              fontSize: 12
            }
          },
          yAxis: {
            type: 'value',
            axisLine: { show: false },
            splitLine: { lineStyle: { color: chartTheme.splitLine } },
            axisLabel: {
              color: chartTheme.axisText,
              fontWeight: 500
            }
          },
          series: [{
            data: [4, 6, 5, 3, 7, 2, 5],
            type: 'bar',
            barWidth: '50%',
            itemStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: chartTheme.seriesBarTop },
                { offset: 1, color: chartTheme.seriesBarBottom }
              ]),
              borderRadius: [6, 6, 0, 0]
            }
          }]
        });

        // 专注时间段分布热力图
        var focusHeatmap = echarts.init(focusHeatmapEl);
        window.focusHeatmap = focusHeatmap;
        focusHeatmap.setOption({
          tooltip: {
            position: 'top',
            backgroundColor: chartTheme.tooltipBg,
            borderColor: chartTheme.tooltipBorder,
            textStyle: { color: chartTheme.tooltipText },
            formatter: function(params) {
              var days = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
              return days[params.value[1]] + ' ' + params.value[0] + ':00-' + (parseInt(params.value[0]) + 2) + ':00<br/>专注强度：' + params.value[2];
            }
          },
          grid: {
            left: '3%',
            right: '8%',
            bottom: '15%',
            top: '5%',
            containLabel: true
          },
          xAxis: {
            type: 'category',
            data: ['0-2', '2-4', '4-6', '6-8', '8-10', '10-12', '12-14', '14-16', '16-18', '18-20', '20-22', '22-24'],
            splitArea: { show: true, areaStyle: { color: [chartTheme.heatAreaA, chartTheme.heatAreaB] } },
            axisLine: { lineStyle: { color: chartTheme.axisLine } },
            axisTick: { lineStyle: { color: chartTheme.axisTick } },
            axisLabel: { 
              color: chartTheme.axisText,
              fontWeight: 500,
              fontSize: 12
            }

          },
          yAxis: {
            type: 'category',
            data: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
            splitArea: { show: true, areaStyle: { color: [chartTheme.heatAreaA, chartTheme.heatAreaB] } },
            axisLine: { lineStyle: { color: chartTheme.axisLine } },
            axisTick: { lineStyle: { color: chartTheme.axisTick } },
            axisLabel: {
              color: chartTheme.axisText,
              fontWeight: 500
            }
          },
          visualMap: {
            min: 0,
            max: 10,
            calculable: true,
            orient: 'horizontal',
            left: 'center',
            bottom: '0%',
            itemWidth: 12,
            itemHeight: 80,
            bgStyle: { color: chartTheme.heatLegendBg, borderColor: chartTheme.tooltipBorder, borderWidth: 1 },
            textStyle: { color: chartTheme.heatLegendText, fontSize: 10 },
            inRange: {
              color: chartTheme.heatRamp
            }
          },
          series: [{
            type: 'heatmap',
            data: [[0, 0, 1], [1, 0, 0], [2, 0, 0], [3, 0, 0], [4, 0, 0], [5, 0, 2], [6, 0, 5], [7, 0, 3], [8, 0, 1], [9, 0, 0], [10, 0, 0], [11, 0, 0], [0, 1, 0], [1, 1, 0], [2, 1, 0], [3, 1, 0], [4, 1, 0], [5, 1, 3], [6, 1, 6], [7, 1, 4], [8, 1, 2], [9, 1, 0], [10, 1, 0], [11, 1, 0], [0, 2, 0], [1, 2, 0], [2, 2, 0], [3, 2, 0], [4, 2, 0], [5, 2, 2], [6, 2, 5], [7, 2, 3], [8, 2, 1], [9, 2, 0], [10, 2, 0], [11, 2, 0], [0, 3, 0], [1, 3, 0], [2, 3, 0], [3, 3, 0], [4, 3, 0], [5, 3, 4], [6, 3, 7], [7, 3, 5], [8, 3, 2], [9, 3, 0], [10, 3, 0], [11, 3, 0], [0, 4, 0], [1, 4, 0], [2, 4, 0], [3, 4, 0], [4, 4, 0], [5, 4, 3], [6, 4, 6], [7, 4, 4], [8, 4, 1], [9, 4, 0], [10, 4, 0], [11, 4, 0], [0, 5, 1], [1, 5, 0], [2, 5, 0], [3, 5, 0], [4, 5, 0], [5, 5, 1], [6, 5, 3], [7, 5, 2], [8, 5, 0], [9, 5, 0], [10, 5, 0], [11, 5, 0], [0, 6, 0], [1, 6, 0], [2, 6, 0], [3, 6, 0], [4, 6, 0], [5, 6, 2], [6, 6, 4], [7, 6, 3], [8, 6, 1], [9, 6, 0], [10, 6, 0], [11, 6, 0]],
            itemStyle: {
              emphasis: {
                shadowBlur: 10,
                shadowColor: 'rgba(0, 0, 0, 0.3)'
              }
            }
          }]
        });

        window.addEventListener('resize', function () {
          taskTrendChart.resize();
          categoryPieChart.resize();
          focusBarChart.resize();
          focusHeatmap.resize();
        });
      }

      function scheduleReportChartsInit() {
        if (window.__reportChartsInitScheduled) return;
        window.__reportChartsInitScheduled = true;
        var run = function () {
          initReportChartsOnce();
        };
        if (window.requestIdleCallback) {
          window.requestIdleCallback(run, { timeout: 1200 });
        } else {
          window.setTimeout(run, 160);
        }
      }

      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', scheduleReportChartsInit);
      } else {
        scheduleReportChartsInit();
      }
      window.addEventListener('load', scheduleReportChartsInit);
    
