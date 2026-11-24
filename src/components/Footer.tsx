import { Collapsible } from "@base-ui/react/collapsible"
import { ChevronRight } from "lucide-react"

export function Footer() {
  return (
    <footer className="shell footer">
      <Collapsible.Root className="rules">
        <Collapsible.Trigger className="collapsible-trigger footer-rules-trigger">
          <ChevronRight size={14} strokeWidth={2.2} className="collapsible-chevron" aria-hidden="true" />
          <span>计价规则说明</span>
        </Collapsible.Trigger>
        <Collapsible.Panel className="collapsible-panel">
          <div className="rules-body">
            <p>
              旧价前 6 公里 3 元，超过后每 10 公里一档，每档加 1 元。新价前 4 公里 3
              元，之后至 8、12、16、23、30、40、50 公里各加 1 元，再每 15 公里一档。
            </p>
            <p>
              线路范围为 1–18 号线和浦江线。磁浮线、金山铁路、市域机场线等另有票制。单程票价优先使用已核对的官网报价，其余按估算里程分档。
            </p>
            <p>
              「置信度较低」表示两套里程估算落在不同计价档。部分对照里程采用轨道数据，来源为{" "}
              <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">
                © OpenStreetMap contributors
              </a>
              。
            </p>
            <p>
              同月多组行程按列表顺序轮流计入刷卡优惠，实际花费视乘车顺序而定。旧规按达到 ¥70 的当次起享 9
              折估算，新规按累计满 ¥90 后的下一次起享 9 折估算。计次票价格和抵扣乘次独立于满额优惠累计。
            </p>
          </div>
        </Collapsible.Panel>
      </Collapsible.Root>
      <span className="footer-updated">规则更新于 2026-11-23</span>
    </footer>
  )
}
