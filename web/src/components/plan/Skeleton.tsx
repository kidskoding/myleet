/** The Plan page while it loads: rendered on the server as the island's fallback, and again while re-loading. */
export default function Skeleton() {
  return (
    <div class="plan-loading" aria-busy="true" aria-label="Loading your plan">
      <div class="skel" style={{ height: "16px", width: "60px" }} />
      <div class="skel" style={{ height: "32px", width: "260px", "margin-top": "16px" }} />
      <div class="skel" style={{ height: "20px", width: "520px", "max-width": "100%", "margin-top": "12px" }} />
      <div class="skel" style={{ height: "32px", width: "100%", "margin-top": "32px" }} />
      <div class="panel" style={{ "margin-top": "12px", padding: "var(--space-4)" }}>
        <div class="skel" style={{ height: "460px" }} />
      </div>
      <div class="route">
        <div class="panel panel-pad">
          <div class="skel" style={{ height: "16px", width: "140px" }} />
          <div class="skel" style={{ height: "92px", "margin-top": "20px" }} />
        </div>
        <div class="panel panel-pad" style={{ display: "grid", gap: "14px" }}>
          <div class="skel" style={{ height: "16px", width: "160px" }} />
          <div class="skel" style={{ height: "28px" }} />
          <div class="skel" style={{ height: "28px" }} />
          <div class="skel" style={{ height: "28px" }} />
        </div>
      </div>
    </div>
  );
}
