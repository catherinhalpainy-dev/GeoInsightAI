// 描述对象结构
// export:让其他文件也能使用该类型
// import type { City } from "./types/city";
// 接口名通常采用大驼峰命名法
// 如果某个字段不一定存在,可以在属性名后加?
// readonly 防止修改
export interface City {
  id: number;
  name: string;
  province: string;
  longitude: number;
  latitude: number;
  population: number;
}