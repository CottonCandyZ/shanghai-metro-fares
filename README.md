# 上海地铁票价计算器

输入常坐的站点和乘车次数，比较上海地铁调价前后的花费。可以按交通卡、随申码等付款方式估算满额优惠，也可以对比逐次付费和 35、45、60、90 次计次票。

**[打开计算器](https://metro.nanachi.moe/)**

## 怎么用

1. 选择起点和终点。支持中文站名、全拼和拼音首字母。
2. 填写一个计次票有效期内的单程次数。去程和回程路线不同，可以分别添加一组。也可以填写本月已累计票款和其中下月的乘车次数。
3. 查看调价前后每程的票价和总花费。扫描分享图上的二维码可以打开计算器，使用分享链接可以恢复对应的行程。

行程会保存在当前浏览器，回来可以接着算。

## 票价和适用范围

2026 年 12 月 1 日起，上海地铁起步价仍为 3 元，起步里程由 6 公里缩短到 4 公里。计算器涵盖 1–18 号线和浦江线。市域机场线、磁浮线和金山铁路适用各自的票制。[上海市发改委票价公告](https://fgw.sh.gov.cn/fgw_jjjctk/20261123/f57b63885c514c829ee269ed589ab2b9.html) · [计次票和满额优惠说明](https://fgw.sh.gov.cn/fgw_gsgg/20261123/78e253eb2682475381bc60ce10f0b303.html)

页面优先采用已核对的官网票价，其余按估算里程计算。两套里程估算跨过同一条计价线时，行程下方会显示相差多少米，以及新价每程可能多算或少算 1 元。实际扣费以运营方为准。[旧票价快照](https://github.com/Naptie/openmetro/blob/a25b71f8a1e815b3c37aaed82e5ad561a6544006/data/cn-shanghai/fares.json) · [© OpenStreetMap contributors](https://www.openstreetmap.org/copyright)

如果发现票价有差异，反馈时可以附上起点、终点和查到的官方票价。[提交反馈](https://github.com/CottonCandyZ/shanghai-metro-fares/issues)

## 本地运行

使用 Node.js 24 和 pnpm。

```sh
pnpm install --frozen-lockfile
pnpm dev
```

通过 `pnpm typecheck` 和 `pnpm test` 检查类型和运行测试。使用 `pnpm build` 构建静态页面。
