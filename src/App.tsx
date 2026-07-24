// 页面内容

import "./App.css";
// useState 用来保存组件中的状态
// 状态：页面中会变化，且变化后要重新显示的数据
import { useState } from "react";


// 大写是自定义组件；
// 小写是 HTML 标签
function App() {
  // useState(0):状态初值为0
  // datasetCount：当前的数据量
  // setDatasetCount：修改数据量的函数
  const [datasetCount, setDatasetCount] = useState(0);
  const [layerCount, setLayerCount] = useState(0);

  // 模拟导入数据
  function handleMockImport() {
    // 不能写 datasetCount = 128;
    // datasetCount是通过const声明的常量，不能直接修改
    setDatasetCount(128);
    setLayerCount(1);
  }

  const [analysisText, setAnalysisText] = useState("");
  const [resultMessage, setResultMessage] = useState("暂无分析方案");

  function handleGeneratePlan() {
    // trim() 删除字符串前后的空格
    const request = analysisText.trim();

    if (!request) {
      setResultMessage("请先输入分析需求");
      return;
    }
    // 模板字符串使用反引号
    setResultMessage(`已生成模拟方案：${request}`);
  }

  return (
    <div className="app">
      <header className="header">

        <div className="brand">
          <div className="logo">Logo</div>
          <h1>GeoInsightAI</h1>
          <p>智能空间数据可视化与分析平台</p>
        </div>
        <nav className="header-actions">
          <button type="button">导入数据</button>
          <button type="button">保存项目</button>
        </nav>
      </header>


      <main className="workspace">
        {/* 左侧区域 */}
        <aside className="sidebar">
          <section className="panel-section">
            <h2>数据集</h2>

            <div className="empty-state">
              <p>暂未导入空间数据</p>
              <button type="button" onClick={handleMockImport}>
                选择文件
              </button>
            </div>
          </section>
          <section className="panel-section">
            <h2>图层列表</h2>
            <p className="muted-text">暂无图层</p>
          </section>

          <section className="panel-section">
            <h2>筛选条件</h2>
            <p className="muted-text">暂无筛选条件</p>
          </section>
        </aside>

        <section className="map-area">
          <div className="map-placeholder">
            <span>地图显示区域</span>
            <p>后续接入 MapLibre GL</p>
          </div>
        </section>

        <aside className="analysis-panel">
          <section className="panel-section">
            <h2>数据概览</h2>

            <div className="statistics">
              <article className="stat-card">
                <span>数据量</span>
                <strong>{datasetCount}</strong>
              </article>

              <article className="stat-card">
                <span>图层数</span>
                <strong>{layerCount}</strong>
              </article>
            </div>
          </section>
          <section className="panel-section">
            <h2>AI 空间分析助手</h2>

            <label htmlFor="analysis-request">
              描述你的空间分析需求
            </label>

            <textarea
              id="analysis-request"
              rows={6}
              value={analysisText}
              onChange={(event) => setAnalysisText(event.target.value)}
              placeholder="例如：筛选人口超过 100 万的城市"
            />

            <button
              className="primary-button"
              type="button"
              onClick={handleGeneratePlan}
            >
              生成分析方案
            </button>
<p className="analysis-result">{resultMessage}</p>
            
          </section>
        </aside>
      </main>
    </div>
  );
}

export default App;