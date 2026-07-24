// 页面内容

import "./App.css";
// useState 用来保存组件中的状态
// 状态：页面中会变化，且变化后要重新显示的数据
import { useState } from "react";
import type { City } from "./types/city";
import { mockCities } from "./data/cities";


// 大写是自定义组件；
// 小写是 HTML 标签
function App() {
  // useState(0):状态初值为0
  // datasetCount：当前的数据量
  // setDatasetCount：修改数据量的函数
  // const [datasetCount, setDatasetCount] = useState(0);
  const [layerCount, setLayerCount] = useState(0);

  const [cities, setCities] = useState<City[]>([]);
  const [searchText, setSearchText] = useState("");

  // 模拟导入数据
  function handleMockImport() {
    setCities(mockCities);
    // 不能写 datasetCount = 128;
    // datasetCount是通过const声明的常量，不能直接修改
    // setDatasetCount(mockCities.length);
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


  // trim():删除字符串前后的空格
  // toLowerCase():将字符串转换为小写
  const keyword = searchText.trim().toLowerCase();
  // filter:数组方法,逐个检查数组中的每一项
  const filteredCities = cities.filter(
    // city:当前正在检查的对象
    (city) => {

      // return决定当前城市是否保留
      return (
        city.name.toLowerCase().includes(keyword) ||
        city.province.toLowerCase().includes(keyword)
      )

    }
  );

// cities.reduce((累计值, 当前城市) => {
//   return 新的累计值;
// }, 初始值);
  const totalPopulation =cities.reduce((total,city)=>{
    return total+city.population;
  },0)

  const averagePopulation =cities.length<=0 ? 0:Math.round(totalPopulation/cities.length);  

  // reduce:将数组中多个元素,逐个计算成一个最终结果
  // <City | null>:明确计算结果是City或者null
  const largestCity =cities.reduce<City | null>(
    (largest,city) => {
      if (!largest ||city.population >largest.population){
        return city;
      }
      return largest;

    },null);

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
            {/* type决定输入框类型:text\number\password\checkbox\search */}
            <input
              className="search-input"
              type="search"
              // value:输入框的当前值,由searchText状态控制
              value={searchText}
              // onChange:负责更新
              onChange={
                // event:该事件
                // event.target:触发事件的元素
                // event.target.value:输入框的当前值
                (event) => setSearchText(event.target.value)
                // 相当于:
                // function handleSearchChange(event){ setSearcText(event.target.value) }
                // onChange={handleSearchChange}
              }
              // 输入框为空显示的提示文字
              placeholder="搜索城市"
            />
            {cities.length === 0 ? (<div className="empty-state">
              <p>暂未导入空间数据</p>

              <button type="button" onClick={handleMockImport}>
                加载示例数据
              </button>
            </div>) : (
              <ul className="city-list">
                {/* map:将每个city对象转换为一个<li>元素 */}
                {filteredCities.map((city) => (
                  // key: React用来追踪每个元素的唯一标识
                  <li className="city-item" key={city.id}>
                    <strong>{city.name}</strong>
                    <span>{city.province}</span>
                  </li>))}
              </ul>
            )}
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
                <span>城市数量</span>
                <strong>{cities.length}</strong>
              </article>

              <article className="stat-card">
                <span>图层数</span>
                <strong>{layerCount}</strong>
              </article>

              <article className="stat-card">
                <span>总人口</span>
                <strong>{totalPopulation}</strong>
              </article>
              <article className="stat-card">
                <span>平均人口</span>
                <strong>{averagePopulation}</strong>
              </article>

            </div>
            <p className="summary-text">
              人口最多:
              {largestCity ? largestCity.name +"("+largestCity.population+"万)" : "暂无数据"}
            </p>
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