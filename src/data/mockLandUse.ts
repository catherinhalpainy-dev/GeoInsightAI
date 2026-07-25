import type { LandUseDataset } from "../types/landUse";
// 模块化作用：
// 1.控制文件职责，避免所有代码写在app.tsx
// 2.允许多个页面复用同一份数据
// 3.便于测试维护
// ***展开运算符不是深拷贝；只复制第一层结构，嵌套对象仍然共享引用


// : TypeScript 的类型标注符号
// const age: number = 18;
export const MockLandUseDataset: LandUseDataset = {
    id: "land-use-demo",
    name: "城市用地分类示例",
    sourceCrs: "EPSG:4326",
    collection: {
        type: "FeatureCollection",
        features: [
            {
                type: "Feature",
                geometry: {
                    type: "Polygon",
                    coordinates: [
                        [
                            [116.3, 39.9],
                            [116.34, 39.9],
                            [116.34, 39.94],
                            [116.3, 39.94],
                            [116.3, 39.9],
                        ],
                    ]
                },
                properties: {
                    id: "LU-001",
                    landUseType: "residential",
                    areaM2: 45000,
                    districtCode: "110105",
                    builtYear: 2005,
                }
            },
            {
                type: "Feature",
                geometry: {
                    type: "Polygon",
                    coordinates: [
                        [
                            [116.35, 39.9],
                            [116.39, 39.9],
                            [116.39, 39.94],
                            [116.35, 39.94],
                            [116.35, 39.9],
                        ]
                    ]
                },
                properties: {
                    id: "LU-002",
                    landUseType: "commercial",
                    areaM2: 12000,
                    districtCode: "110105",
                    builtYear: 2012,
                },
            },
            {
                type: "Feature",

                geometry: {
                    type: "Polygon",
                    coordinates: [
                        [
                            [116.4, 39.9],
                            [116.45, 39.9],
                            [116.45, 39.95],
                            [116.4, 39.95],
                            [116.4, 39.9],
                        ],
                    ],
                },

                properties: {
                    id: "LU-003",
                    landUseType: "industrial",
                    areaM2: 89000,
                    districtCode: "110106",
                    builtYear: 1998,
                },
            },

            {
                type: "Feature",

                geometry: {
                    type: "Polygon",
                    coordinates: [
                        [
                            [116.3, 39.96],
                            [116.34, 39.96],
                            [116.34, 40],
                            [116.3, 40],
                            [116.3, 39.96],
                        ],
                    ],
                },

                properties: {
                    id: "LU-004",
                    landUseType: "green",
                    areaM2: 23000,
                    districtCode: "110105",
                    builtYear: 2015,
                },
            },

            {
                type: "Feature",

                geometry: {
                    type: "Polygon",
                    coordinates: [
                        [
                            [116.35, 39.96],
                            [116.39, 39.96],
                            [116.39, 40],
                            [116.35, 40],
                            [116.35, 39.96],
                        ],
                    ],
                },

                properties: {
                    id: "LU-005",
                    landUseType: "residential",
                    areaM2: 67000,
                    districtCode: "110105",
                    builtYear: 2008,
                },
            },

            {
                type: "Feature",

                geometry: {
                    type: "Polygon",
                    coordinates: [
                        [
                            [116.4, 39.96],
                            [116.44, 39.96],
                            [116.44, 40],
                            [116.4, 40],
                            [116.4, 39.96],
                        ],
                    ],
                },

                properties: {
                    id: "LU-006",
                    landUseType: "public",
                    areaM2: 15000,
                    districtCode: "110108",
                    builtYear: null,
                },
            },
        ]
    },
}