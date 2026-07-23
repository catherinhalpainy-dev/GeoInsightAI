// 页面内容

import "./App.css";

function App() {
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
              <button type="button">选择文件</button>
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
                <strong>0</strong>
              </article>

              <article className="stat-card">
                <span>图层数</span>
                <strong>0</strong>
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
              placeholder="例如：筛选人口超过 100 万的城市"
            />

            <button className="primary-button" type="button">
              生成分析方案
            </button>
          </section>
        </aside>
      </main>
    </div>
  );
}

export default App;