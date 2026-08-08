import type {
  LandUseDataset,
} from "../../types/landUse";

interface DatasetOverviewProps {
  dataset: LandUseDataset;
}

export function DatasetOverview({
  dataset,
}: DatasetOverviewProps) {
  const features =
    dataset.collection.features;

  const districtCount =
    new Set(
      features.map((feature) => {
        return (
          feature.properties
            .districtCode
        );
      }),
    ).size;

  return (
    <section className="import-overview-section">
      <div className="import-section-heading">
        <div>
          <h2>数据概览</h2>
          <p>
            已通过基础 GeoJSON
            结构校验
          </p>
        </div>
      </div>

      <div className="import-overview-grid">
        <article>
          <span>要素数量</span>
          <strong>
            {features.length}
          </strong>
          <small>Polygon</small>
        </article>

        <article>
          <span>坐标系统</span>
          <strong>EPSG:4326</strong>
          <small>WGS 84</small>
        </article>

        <article>
          <span>属性字段</span>
          <strong>5</strong>
          <small>
            标准用地字段
          </small>
        </article>

        <article>
          <span>行政区</span>
          <strong>
            {districtCount}
          </strong>
          <small>
            districtCode
          </small>
        </article>
      </div>
    </section>
  );
}