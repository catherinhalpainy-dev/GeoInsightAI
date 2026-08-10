import {
  Link,
} from "react-router-dom";

export function NotFoundPage() {
  return (
    <section className="page-content">
      <h1>页面不存在</h1>

      <p>
        当前地址没有对应的
        GeoInsight AI 页面。
      </p>

      <Link to="/workspace">
        返回地图工作台
      </Link>
    </section>
  );
}