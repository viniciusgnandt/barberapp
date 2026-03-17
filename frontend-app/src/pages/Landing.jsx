import jubaosLogo from '../assets/JubaOS_Logo.png';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

/* ─── inline CSS para gradientes, animações e mock UI ─── */
const CSS = `
  .lp { font-family: 'Inter', system-ui, sans-serif; background: #0b0c0e; color: #f0f1f3; line-height: 1.6; }
  .lp *, .lp *::before, .lp *::after { box-sizing: border-box; margin: 0; padding: 0; }
  .lp a { text-decoration: none; color: inherit; }

  /* tokens */
  .lp { --brand:#7c3aed; --brand-l:#a78bfa; --brand-d:#5b21b6; --brand-glow:rgba(124,58,237,.22);
    --bg:#0b0c0e; --bg2:#111317; --bg3:#17191f; --bgc:#1a1c23; --bgc2:#1f2129;
    --bdr:rgba(255,255,255,.07); --bdr-b:rgba(124,58,237,.32);
    --txt:#f0f1f3; --muted:#7a7f8e; --subtle:#3a3f50; --r:14px; }

  /* gradient text */
  .lp .gt { background:linear-gradient(135deg,#5eead4 0%,#a78bfa 50%,#7c3aed 100%);
    -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }

  /* badge */
  .lp .badge { display:inline-flex; align-items:center; gap:6px; padding:5px 13px; border-radius:99px;
    font-size:12px; font-weight:600; letter-spacing:.4px;
    background:rgba(124,58,237,.1); color:var(--brand-l); border:1px solid rgba(124,58,237,.2); }

  /* buttons */
  .lp .btn { display:inline-flex; align-items:center; gap:8px; padding:13px 26px;
    border-radius:9px; font-size:15px; font-weight:600; cursor:pointer; transition:all .22s; border:none; }
  .lp .btn-p { background:var(--brand); color:#fff; box-shadow:0 4px 20px rgba(124,58,237,.28); }
  .lp .btn-p:hover { background:var(--brand-l); transform:translateY(-2px); box-shadow:0 8px 28px rgba(124,58,237,.38); }
  .lp .btn-o { background:transparent; color:var(--txt); border:1px solid var(--bdr); }
  .lp .btn-o:hover { border-color:var(--brand); color:var(--brand-l); transform:translateY(-2px); }
  .lp .btn-lg { padding:16px 36px; font-size:17px; border-radius:11px; }

  /* animations */
  @keyframes lp-fadeUp { from{opacity:0;transform:translateY(22px)} to{opacity:1;transform:translateY(0)} }
  @keyframes lp-float  { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-9px)} }
  @keyframes lp-pulse  { 0%,100%{box-shadow:0 0 0 0 var(--brand-glow)} 50%{box-shadow:0 0 0 16px transparent} }
  .lp .afu  { animation:lp-fadeUp .6s ease forwards; }
  .lp .aflt { animation:lp-float 4s ease-in-out infinite; }
  .lp .reveal { opacity:0; transform:translateY(28px); transition:opacity .55s ease, transform .55s ease; }
  .lp .reveal.vis { opacity:1; transform:translateY(0); }
  .lp .d1{transition-delay:.1s} .lp .d2{transition-delay:.2s} .lp .d3{transition-delay:.3s} .lp .d4{transition-delay:.4s}

  /* navbar */
  .lp .nav { position:fixed; top:0; left:0; right:0; z-index:100; padding:15px 0; transition:all .3s; }
  .lp .nav.sc { background:rgba(11,12,14,.88); backdrop-filter:blur(16px); border-bottom:1px solid var(--bdr); }
  .lp .nav-inner { max-width:1120px; margin:0 auto; padding:0 24px;
    display:flex; align-items:center; justify-content:space-between; }
  .lp .logo { display:flex; align-items:center; gap:10px; font-size:19px; font-weight:800; letter-spacing:-.5px; }
  .lp .logo-icon { width:38px; height:38px; border-radius:9px;
    display:flex; align-items:center; justify-content:center; }
  .lp .logo-icon svg { width:19px; height:19px; color:#fff; }
  .lp .nav-links { display:flex; gap:4px; }
  .lp .nav-links a { padding:8px 14px; border-radius:8px; font-size:14px; font-weight:500;
    color:var(--muted); transition:all .2s; }
  .lp .nav-links a:hover { color:var(--txt); background:var(--bgc); }
  .lp .nav-cta { display:flex; gap:10px; align-items:center; }
  .lp .btn-sm { padding:9px 20px; font-size:14px; border-radius:8px; }
  .lp .mob-btn { display:none; background:none; border:none; color:var(--txt); cursor:pointer; }

  /* mobile nav */
  .lp .mob-menu { display:none; flex-direction:column; gap:5px; padding:16px 24px;
    background:rgba(11,12,14,.97); backdrop-filter:blur(16px); border-bottom:1px solid var(--bdr); }
  .lp .mob-menu.open { display:flex; }
  .lp .mob-menu a { padding:11px 14px; border-radius:8px; font-size:15px; color:var(--muted); transition:all .2s; }
  .lp .mob-menu a:hover { color:var(--txt); background:var(--bgc); }

  /* hero */
  .lp .hero { padding:160px 0 100px; position:relative; overflow:hidden; }
  .lp .hero-bg { position:absolute; inset:0;
    background:radial-gradient(ellipse 80% 55% at 50% -10%,rgba(124,58,237,.11) 0%,transparent 70%),
               radial-gradient(ellipse 40% 40% at 85% 50%,rgba(124,58,237,.05) 0%,transparent 60%); }
  .lp .hero-grid { position:absolute; inset:0;
    background-image:linear-gradient(rgba(255,255,255,.018) 1px,transparent 1px),
                     linear-gradient(90deg,rgba(255,255,255,.018) 1px,transparent 1px);
    background-size:60px 60px;
    mask-image:radial-gradient(ellipse 80% 80% at 50% 0%,black 0%,transparent 80%); }
  .lp .hero-content { position:relative; z-index:1; max-width:1120px; margin:0 auto; padding:0 24px;
    display:grid; grid-template-columns:1fr 1fr; gap:60px; align-items:center; }
  .lp .hero-left { display:flex; flex-direction:column; gap:24px; }
  .lp .hero-title { font-size:clamp(36px,5vw,60px); font-weight:900; letter-spacing:-2px; line-height:1.1; }
  .lp .hero-sub { font-size:17px; color:var(--muted); line-height:1.75; max-width:460px; }
  .lp .hero-btns { display:flex; gap:14px; flex-wrap:wrap; align-items:center; }
  .lp .hero-stats { display:flex; gap:32px; padding-top:6px; }
  .lp .stat-num { font-size:24px; font-weight:800; color:var(--brand-l); line-height:1; }
  .lp .stat-lbl { font-size:12px; color:var(--muted); margin-top:2px; }

  /* mock browser */
  .lp .mock-wrap { position:relative; }
  .lp .mock-browser { background:var(--bgc); border:1px solid var(--bdr); border-radius:18px;
    overflow:hidden; box-shadow:0 0 0 1px rgba(255,255,255,.04),0 40px 80px rgba(0,0,0,.5),
    0 0 60px rgba(124,58,237,.07); animation:lp-float 4.2s ease-in-out infinite; }
  .lp .mb-bar { display:flex; align-items:center; gap:6px; padding:11px 15px;
    background:var(--bg2); border-bottom:1px solid var(--bdr); }
  .lp .dot { width:10px; height:10px; border-radius:50%; }
  .lp .dot-r{background:#ff5f57} .lp .dot-y{background:#ffbd2e} .lp .dot-g{background:#28c840}
  .lp .mb-url { flex:1; margin-left:8px; background:var(--bg3); border-radius:5px;
    padding:4px 11px; font-size:11px; color:var(--subtle); }
  .lp .mb-body { padding:14px; display:flex; gap:11px; height:272px; }
  .lp .mb-sidebar { width:130px; flex-shrink:0; display:flex; flex-direction:column; gap:5px; }
  .lp .mb-logo { display:flex; align-items:center; gap:7px; padding:6px; margin-bottom:7px; }
  .lp .mb-li { width:22px; height:22px; border-radius:6px; background:var(--brand); flex-shrink:0; }
  .lp .mb-lt { width:55px; height:9px; border-radius:3px; background:rgba(255,255,255,.13); }
  .lp .mb-ni { display:flex; align-items:center; gap:7px; padding:7px 7px; border-radius:6px; }
  .lp .mb-ni.a { background:rgba(124,58,237,.12); }
  .lp .mb-ic { width:14px; height:14px; border-radius:3px; background:rgba(255,255,255,.07); flex-shrink:0; }
  .lp .mb-ni.a .mb-ic { background:rgba(124,58,237,.35); }
  .lp .mb-nt { width:50px; height:7px; border-radius:3px; background:rgba(255,255,255,.07); }
  .lp .mb-ni.a .mb-nt { background:rgba(124,58,237,.38); }
  .lp .mb-main { flex:1; display:flex; flex-direction:column; gap:9px; }
  .lp .mb-stats { display:grid; grid-template-columns:repeat(3,1fr); gap:7px; }
  .lp .mb-sc { background:var(--bg2); border:1px solid var(--bdr); border-radius:8px; padding:9px 10px; }
  .lp .mb-sc:first-child { border-color:rgba(124,58,237,.22); }
  .lp .mb-st { display:flex; justify-content:space-between; margin-bottom:5px; }
  .lp .mb-sd { width:16px; height:16px; border-radius:4px; background:rgba(124,58,237,.18); }
  .lp .mb-sl { width:26px; height:5px; border-radius:3px; background:rgba(255,255,255,.06); }
  .lp .mb-sn { width:36px; height:12px; border-radius:3px; background:rgba(255,255,255,.11); }
  .lp .mb-sc:first-child .mb-sn { background:rgba(124,58,237,.38); }
  .lp .mb-ss { width:50px; height:6px; border-radius:3px; background:rgba(255,255,255,.06); margin-top:3px; }
  .lp .mb-appts { display:flex; flex-direction:column; gap:6px; flex:1; }
  .lp .mb-appt { background:var(--bg2); border:1px solid var(--bdr); border-radius:7px; padding:7px 10px;
    display:flex; align-items:center; gap:9px; }
  .lp .mb-appt:first-child { border-color:rgba(124,58,237,.2); }
  .lp .mb-av { width:24px; height:24px; border-radius:50%; background:rgba(124,58,237,.22); flex-shrink:0; }
  .lp .mb-ai { flex:1; display:flex; flex-direction:column; gap:3px; }
  .lp .mb-an { width:72px; height:6px; border-radius:3px; background:rgba(255,255,255,.14); }
  .lp .mb-as { width:50px; height:5px; border-radius:3px; background:rgba(255,255,255,.07); }
  .lp .mb-badge { padding:2px 7px; border-radius:99px; font-size:9px; font-weight:700; white-space:nowrap;
    background:rgba(34,197,94,.1); color:#4ade80; border:1px solid rgba(34,197,94,.2); }
  .lp .mb-badge.pend { background:rgba(124,58,237,.1); color:var(--brand-l); border-color:rgba(124,58,237,.2); }

  /* floating badge */
  .lp .fl-badge { position:absolute; bottom:-14px; left:-18px;
    background:var(--bgc2); border:1px solid var(--bdr-b); border-radius:13px;
    padding:11px 15px; display:flex; align-items:center; gap:9px;
    box-shadow:0 8px 28px rgba(0,0,0,.38); animation:lp-float 3.2s ease-in-out infinite reverse; }
  .lp .fl-ic { width:34px; height:34px; border-radius:8px; background:rgba(124,58,237,.14);
    display:flex; align-items:center; justify-content:center; color:var(--brand-l); }
  .lp .fl-ic svg { width:17px; height:17px; }
  .lp .fl-num { font-size:17px; font-weight:800; color:var(--brand-l); line-height:1; }
  .lp .fl-lbl { font-size:11px; color:var(--muted); margin-top:1px; }
  .lp .fl-badge2 { position:absolute; top:-10px; right:-14px;
    background:var(--bgc2); border:1px solid var(--bdr); border-radius:13px;
    padding:9px 13px; display:flex; align-items:center; gap:7px; font-size:12px; font-weight:600; color:#4ade80;
    box-shadow:0 8px 28px rgba(0,0,0,.35); animation:lp-float 3.7s ease-in-out infinite; }
  .lp .fl-dot { width:7px; height:7px; border-radius:50%; background:#4ade80; animation:lp-pulse 2s infinite; }

  /* sections */
  .lp section { padding:88px 0; }
  .lp .container { max-width:1120px; margin:0 auto; padding:0 24px; }
  .lp .sec-badge { margin-bottom:14px; }
  .lp .sec-title { font-size:clamp(26px,4vw,44px); font-weight:800; letter-spacing:-1px; line-height:1.15; margin-bottom:14px; }
  .lp .sec-sub { font-size:16px; color:var(--muted); max-width:540px; line-height:1.75; }
  .lp .sec-hdr { margin-bottom:52px; }
  .lp .sec-hdr.ctr { text-align:center; }
  .lp .sec-hdr.ctr .sec-sub { margin:0 auto; }

  /* problem */
  .lp .prob-bg { background:var(--bg2); }
  .lp .two-col { display:grid; grid-template-columns:1fr 1fr; gap:52px; align-items:center; }
  .lp .prob-list { display:flex; flex-direction:column; gap:13px; margin-top:28px; }
  .lp .prob-item { display:flex; align-items:flex-start; gap:13px; padding:14px 18px;
    background:var(--bg3); border-radius:var(--r); border:1px solid var(--bdr); transition:all .22s; }
  .lp .prob-item:hover { border-color:rgba(239,68,68,.22); transform:translateX(4px); }
  .lp .prob-ico { width:34px; height:34px; border-radius:8px; flex-shrink:0;
    background:rgba(239,68,68,.1); display:flex; align-items:center; justify-content:center; color:#f87171; }
  .lp .prob-ico svg { width:17px; height:17px; }
  .lp .prob-item h4 { font-size:14px; font-weight:600; margin-bottom:2px; }
  .lp .prob-item p  { font-size:13px; color:var(--muted); }
  .lp .chaos-card { background:var(--bg3); border:1px solid rgba(239,68,68,.14);
    border-radius:var(--r); padding:17px 18px; position:relative; overflow:hidden; margin-bottom:14px; }
  .lp .chaos-card::before { content:''; position:absolute; top:0; left:0; right:0; height:2px;
    background:linear-gradient(90deg,#ef4444,#f87171); }
  .lp .chaos-ttl { font-size:12px; font-weight:600; color:var(--muted); margin-bottom:9px; }
  .lp .chaos-rows { display:flex; flex-direction:column; gap:5px; }
  .lp .chaos-row { display:flex; gap:5px; }
  .lp .cc { height:20px; border-radius:4px; background:rgba(255,255,255,.05); flex:1; }
  .lp .cc.f { background:rgba(239,68,68,.1); border:1px solid rgba(239,68,68,.18); }
  .lp .cc.x { background:rgba(239,68,68,.22); animation:lp-pulse 1.6s ease-in-out infinite; }

  /* solution */
  .lp .sol-list { display:flex; flex-direction:column; gap:10px; }
  .lp .sol-item { display:flex; align-items:flex-start; gap:13px; padding:13px 16px;
    border-radius:var(--r); border:1px solid transparent; transition:all .22s; }
  .lp .sol-item:hover { background:var(--bgc); border-color:var(--bdr-b); transform:translateX(4px); }
  .lp .sol-chk { width:22px; height:22px; border-radius:6px; flex-shrink:0;
    background:rgba(124,58,237,.1); display:flex; align-items:center; justify-content:center; color:var(--brand-l); }
  .lp .sol-chk svg { width:13px; height:13px; }
  .lp .sol-item h4 { font-size:14px; font-weight:600; margin-bottom:2px; }
  .lp .sol-item p  { font-size:13px; color:var(--muted); }

  /* features */
  .lp .feat-bg { background:var(--bg2); }
  .lp .feat-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(290px,1fr)); gap:18px; }
  .lp .feat-card { background:var(--bgc); border:1px solid var(--bdr); border-radius:18px;
    padding:26px 24px; transition:all .24s; position:relative; overflow:hidden; }
  .lp .feat-card::after { content:''; position:absolute; inset:0; border-radius:inherit;
    background:radial-gradient(ellipse 80% 80% at 50% 0%,var(--brand-glow),transparent 60%);
    opacity:0; transition:opacity .3s; }
  .lp .feat-card:hover { border-color:var(--bdr-b); transform:translateY(-4px); }
  .lp .feat-card:hover::after { opacity:1; }
  .lp .feat-ico { width:44px; height:44px; border-radius:11px; margin-bottom:16px;
    background:rgba(124,58,237,.1); border:1px solid rgba(124,58,237,.14);
    display:flex; align-items:center; justify-content:center; color:var(--brand-l); position:relative; z-index:1; }
  .lp .feat-ico svg { width:21px; height:21px; }
  .lp .feat-card h3 { font-size:16px; font-weight:700; margin-bottom:7px; position:relative; z-index:1; }
  .lp .feat-card p  { font-size:13px; color:var(--muted); line-height:1.65; position:relative; z-index:1; }
  .lp .feat-tag { display:inline-block; margin-top:12px; padding:3px 10px; border-radius:99px;
    font-size:11px; font-weight:600; background:rgba(124,58,237,.08); color:var(--brand-l);
    border:1px solid rgba(124,58,237,.15); position:relative; z-index:1; }
  .lp .feat-tag.new  { background:rgba(34,197,94,.08); color:#4ade80; border-color:rgba(34,197,94,.2); }
  .lp .feat-tag.soon { background:rgba(139,92,246,.08); color:#c084fc; border-color:rgba(139,92,246,.2); }
  .lp .feat-ico.purple { background:rgba(139,92,246,.1); border-color:rgba(139,92,246,.15); color:#c084fc; }
  .lp .feat-ico.green  { background:rgba(34,197,94,.1);  border-color:rgba(34,197,94,.15);  color:#4ade80; }

  /* demo */
  .lp .demo-tabs { display:flex; gap:6px; justify-content:center; flex-wrap:wrap; margin-bottom:36px; }
  .lp .demo-tab { padding:9px 20px; border-radius:99px; font-size:14px; font-weight:500; cursor:pointer;
    background:var(--bgc); border:1px solid var(--bdr); color:var(--muted); transition:all .22s; }
  .lp .demo-tab.act, .lp .demo-tab:hover { background:rgba(124,58,237,.1); color:var(--brand-l); border-color:var(--bdr-b); }
  .lp .demo-screen { display:none; background:var(--bgc); border:1px solid var(--bdr); border-radius:18px;
    overflow:hidden; box-shadow:0 40px 90px rgba(0,0,0,.48),0 0 60px rgba(124,58,237,.05); }
  .lp .demo-screen.act { display:block; }
  .lp .demo-bar { background:var(--bg2); border-bottom:1px solid var(--bdr); padding:12px 18px;
    display:flex; align-items:center; gap:8px; }
  .lp .demo-title-bar { font-size:12px; color:var(--muted); margin-left:8px; font-weight:500; }
  .lp .demo-body { display:flex; min-height:360px; }
  .lp .demo-sb { width:170px; flex-shrink:0; background:var(--bg2); border-right:1px solid var(--bdr);
    padding:18px 10px; display:flex; flex-direction:column; gap:3px; }
  .lp .d-logo { display:flex; align-items:center; gap:8px; padding:7px; margin-bottom:10px; }
  .lp .d-li { width:26px; height:26px; border-radius:6px; background:var(--brand); flex-shrink:0; }
  .lp .d-lt { font-size:12px; font-weight:700; }
  .lp .d-nav { display:flex; align-items:center; gap:8px; padding:8px 9px; border-radius:7px;
    font-size:12px; color:var(--muted); transition:all .2s; }
  .lp .d-nav.act { background:rgba(124,58,237,.12); color:var(--brand-l); font-weight:600; }
  .lp .d-nav svg { width:14px; height:14px; flex-shrink:0; }
  .lp .demo-main { flex:1; padding:20px; overflow:hidden; }

  /* dashboard demo */
  .lp .d-stats { display:grid; grid-template-columns:repeat(4,1fr); gap:10px; margin-bottom:16px; }
  .lp .d-stat { background:var(--bg2); border:1px solid var(--bdr); border-radius:9px; padding:12px 14px; }
  .lp .d-stat:first-child { border-color:var(--bdr-b); }
  .lp .d-slbl { font-size:10px; color:var(--muted); margin-bottom:5px; }
  .lp .d-sval { font-size:20px; font-weight:800; }
  .lp .d-stat:first-child .d-sval { color:var(--brand-l); }
  .lp .d-ssub { font-size:10px; color:#4ade80; margin-top:2px; }
  .lp .d-row { display:grid; grid-template-columns:2fr 1fr; gap:10px; }
  .lp .d-card { background:var(--bg2); border:1px solid var(--bdr); border-radius:9px; padding:14px; }
  .lp .d-ctitle { font-size:11px; font-weight:600; color:var(--muted); margin-bottom:12px; }
  .lp .d-bars { display:flex; align-items:flex-end; gap:5px; height:72px; }
  .lp .d-bar { flex:1; border-radius:3px 3px 0 0; background:rgba(124,58,237,.14); min-width:0; }
  .lp .d-bar.hl { background:var(--brand); }
  .lp .d-xlbls { display:flex; justify-content:space-between; margin-top:4px; }
  .lp .d-xl { font-size:9px; color:var(--subtle); }
  .lp .d-xl.hl { color:var(--brand-l); font-weight:700; }
  .lp .d-list { display:flex; flex-direction:column; gap:7px; }
  .lp .d-li-item { display:flex; align-items:center; gap:7px; font-size:11px; color:var(--muted); }
  .lp .d-dot { width:7px; height:7px; border-radius:50%; background:var(--brand); flex-shrink:0; }

  /* agenda demo */
  .lp .ag-hdr { display:flex; align-items:center; justify-content:space-between; margin-bottom:14px; }
  .lp .ag-ttl { font-size:15px; font-weight:700; }
  .lp .ag-btn { padding:7px 13px; border-radius:7px; font-size:11px; font-weight:600;
    background:var(--brand); color:#fff; border:none; cursor:pointer; }
  .lp .ag-list { display:flex; flex-direction:column; gap:7px; }
  .lp .ag-appt { display:flex; align-items:center; gap:11px; background:var(--bg2);
    border:1px solid var(--bdr); border-radius:8px; padding:9px 12px; }
  .lp .ag-appt:first-child { border-color:var(--bdr-b); }
  .lp .ag-time { font-size:12px; font-weight:700; color:var(--brand-l); width:34px; flex-shrink:0; }
  .lp .ag-av { width:26px; height:26px; border-radius:50%; background:rgba(124,58,237,.2); flex-shrink:0; }
  .lp .ag-info { flex:1; }
  .lp .ag-name { font-size:12px; font-weight:600; }
  .lp .ag-svc  { font-size:10px; color:var(--muted); }
  .lp .ag-status { padding:2px 8px; border-radius:99px; font-size:9px; font-weight:700;
    background:rgba(34,197,94,.1); color:#4ade80; border:1px solid rgba(34,197,94,.2); }
  .lp .ag-status.pend { background:rgba(124,58,237,.1); color:var(--brand-l); border-color:rgba(124,58,237,.2); }

  /* benefits */
  .lp .ben-bg { background:var(--bg2); }
  .lp .ben-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:20px; }
  .lp .ben-card { background:var(--bgc); border:1px solid var(--bdr); border-radius:18px;
    padding:30px 26px; display:flex; gap:18px; align-items:flex-start; transition:all .22s; }
  .lp .ben-card:hover { border-color:var(--bdr-b); transform:translateY(-3px); }
  .lp .ben-num { font-size:40px; font-weight:900; line-height:1;
    background:linear-gradient(135deg,var(--brand),var(--brand-l));
    -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text;
    flex-shrink:0; width:56px; }
  .lp .ben-card h3 { font-size:17px; font-weight:700; margin-bottom:7px; }
  .lp .ben-card p  { font-size:13px; color:var(--muted); line-height:1.65; }

  /* testimonials */
  .lp .test-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:18px; }
  .lp .test-card { background:var(--bgc); border:1px solid var(--bdr); border-radius:18px;
    padding:24px; transition:all .22s; }
  .lp .test-card:hover { border-color:var(--bdr-b); }
  .lp .stars { display:flex; gap:2px; margin-bottom:12px; color:var(--brand-l); font-size:13px; }
  .lp .test-txt { font-size:13px; color:var(--muted); line-height:1.75; margin-bottom:16px; font-style:italic; }
  .lp .test-auth { display:flex; align-items:center; gap:9px; }
  .lp .test-av { width:36px; height:36px; border-radius:50%; flex-shrink:0;
    display:flex; align-items:center; justify-content:center; font-weight:800; font-size:13px; }
  .lp .test-name { font-size:13px; font-weight:600; }
  .lp .test-role { font-size:11px; color:var(--muted); }

  /* cta */
  .lp .cta-box { background:var(--bgc); border:1px solid var(--bdr-b); border-radius:22px;
    padding:60px; text-align:center; box-shadow:0 0 80px rgba(124,58,237,.05);
    position:relative; overflow:hidden; }
  .lp .cta-box::before { content:''; position:absolute; inset:0; border-radius:inherit;
    background:radial-gradient(ellipse 70% 70% at 50% 50%,rgba(124,58,237,.07),transparent 70%); pointer-events:none; }
  .lp .cta-btns { display:flex; gap:14px; justify-content:center; flex-wrap:wrap; }
  .lp .cta-note { margin-top:14px; font-size:12px; color:var(--muted); }

  /* footer */
  .lp footer { background:var(--bg2); border-top:1px solid var(--bdr); padding:56px 0 28px; }
  .lp .ft-top { display:grid; grid-template-columns:2fr 1fr 1fr 1fr; gap:36px; margin-bottom:44px; }
  .lp .ft-desc { font-size:13px; color:var(--muted); margin:10px 0 18px; max-width:270px; line-height:1.75; }
  .lp .ft-socials { display:flex; gap:9px; }
  .lp .ft-soc { width:34px; height:34px; border-radius:8px; background:var(--bgc);
    border:1px solid var(--bdr); display:flex; align-items:center; justify-content:center;
    color:var(--muted); transition:all .22s; }
  .lp .ft-soc:hover { border-color:var(--brand); color:var(--brand-l); }
  .lp .ft-soc svg { width:15px; height:15px; }
  .lp .ft-col h4 { font-size:12px; font-weight:700; letter-spacing:.5px; color:var(--muted);
    text-transform:uppercase; margin-bottom:14px; }
  .lp .ft-col ul { list-style:none; display:flex; flex-direction:column; gap:9px; }
  .lp .ft-col ul a { font-size:13px; color:var(--muted); transition:color .2s; }
  .lp .ft-col ul a:hover { color:var(--txt); }
  .lp .ft-btm { border-top:1px solid var(--bdr); padding-top:24px;
    display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px; }
  .lp .ft-btm p { font-size:12px; color:var(--subtle); }
  .lp .ft-links { display:flex; gap:18px; }
  .lp .ft-links a { font-size:12px; color:var(--subtle); transition:color .2s; }
  .lp .ft-links a:hover { color:var(--muted); }

  /* responsive */
  @media(max-width:900px){
    .lp .hero-content { grid-template-columns:1fr; gap:44px; }
    .lp .mock-wrap { display:none; }
    .lp .hero { padding:120px 0 72px; }
    .lp .two-col { grid-template-columns:1fr; }
    .lp .d-stats { grid-template-columns:repeat(2,1fr); }
    .lp .ben-grid { grid-template-columns:1fr; }
    .lp .test-grid { grid-template-columns:1fr; }
    .lp .ft-top { grid-template-columns:1fr 1fr; }
    .lp .nav-links { display:none; }
    .lp .mob-btn { display:flex; align-items:center; }
    .lp .nav-cta .btn-sm { display:none; }
  }
  @media(max-width:600px){
    .lp section { padding:60px 0; }
    .lp .cta-box { padding:36px 20px; }
    .lp .ft-top { grid-template-columns:1fr; }
    .lp .hero-stats { flex-wrap:wrap; gap:20px; }
    .lp .feat-grid { grid-template-columns:1fr; }
    .lp .demo-sb { width:120px; }
    .lp .demo-sb span { display:none; }
    .lp .d-stats { grid-template-columns:repeat(2,1fr); }
    .lp .ft-btm { flex-direction:column; align-items:flex-start; }
  }
`;

/* ─── SVG icon helpers ─── */
const Ico = ({ d, d2, extra = '', size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />{d2 && <path d={d2} />}
    {extra && <g dangerouslySetInnerHTML={{ __html: extra }} />}
  </svg>
);

export default function Landing() {
  const [scrolled,    setScrolled]    = useState(false);
  const [mobileOpen,  setMobileOpen]  = useState(false);
  const [activeTab,   setActiveTab]   = useState('dashboard');

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);

    const obs = new IntersectionObserver(
      entries => entries.forEach(e => e.isIntersecting && e.target.classList.add('vis')),
      { threshold: 0.1, rootMargin: '0px 0px -36px 0px' }
    );
    document.querySelectorAll('.lp .reveal').forEach(el => obs.observe(el));

    return () => { window.removeEventListener('scroll', onScroll); obs.disconnect(); };
  }, []);

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    setMobileOpen(false);
  };

  return (
    <div className="lp">
      <style>{CSS}</style>

      {/* ── NAVBAR ── */}
      <nav className={`nav${scrolled ? ' sc' : ''}`}>
        <div className="nav-inner">
          <a href="#" className="logo" onClick={e => { e.preventDefault(); window.scrollTo({ top:0, behavior:'smooth' }); }}>
            <div className="logo-icon">
              <img src={jubaosLogo} alt="JubaOS" width="36" height="36" style={{objectFit:'contain',borderRadius:'22%'}}/>
            </div>
            <span className="gt">JubaOS</span>
          </a>

          <div className="nav-links">
            <a href="#features" onClick={e=>{e.preventDefault();scrollTo('features')}}>Funcionalidades</a>
            <a href="#demo"     onClick={e=>{e.preventDefault();scrollTo('demo')}}>Demo</a>
            <a href="#benefits" onClick={e=>{e.preventDefault();scrollTo('benefits')}}>Benefícios</a>
          </div>

          <div className="nav-cta">
            <Link to="/login"    className="btn btn-o btn-sm">Já sou cliente</Link>
            <Link to="/register" className="btn btn-p btn-sm">Criar conta grátis</Link>
            <button className="mob-btn" onClick={() => setMobileOpen(o => !o)} aria-label="Menu">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
            </button>
          </div>
        </div>

        <div className={`mob-menu${mobileOpen ? ' open' : ''}`}>
          <a href="#features" onClick={e=>{e.preventDefault();scrollTo('features')}}>Funcionalidades</a>
          <a href="#demo"     onClick={e=>{e.preventDefault();scrollTo('demo')}}>Demo</a>
          <a href="#benefits" onClick={e=>{e.preventDefault();scrollTo('benefits')}}>Benefícios</a>
          <Link to="/login"    className="btn btn-o" style={{justifyContent:'center',marginTop:'4px'}}>Já sou cliente</Link>
          <Link to="/register" className="btn btn-p" style={{justifyContent:'center'}}>Criar conta grátis</Link>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="hero">
        <div className="hero-bg" /><div className="hero-grid" />
        <div className="hero-content">
          <div className="hero-left afu">
            <div>
              <span className="badge">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                Plataforma Inteligente para Barbearias
              </span>
            </div>
            <h1 className="hero-title">
              Sua barbearia,<br/><span className="gt">100% organizada</span>
            </h1>
            <p className="hero-sub">
              Chega de agenda no papel e horários perdidos. O JubaOS centraliza agendamentos, clientes, serviços e faturamento em um único sistema moderno.
            </p>
            <div className="hero-btns">
              <Link to="/register" className="btn btn-p btn-lg">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
                Começar gratuitamente
              </Link>
              <Link to="/login" className="btn btn-o btn-lg">Já sou cliente</Link>
            </div>
            <div className="hero-stats">
              <div><div className="stat-num">500+</div><div className="stat-lbl">Barbearias ativas</div></div>
              <div><div className="stat-num">98%</div><div className="stat-lbl">Satisfação</div></div>
              <div><div className="stat-num">3×</div><div className="stat-lbl">Mais organizado</div></div>
            </div>
          </div>

          {/* Mock browser */}
          <div className="mock-wrap">
            <div className="mock-browser">
              <div className="mb-bar">
                <div className="dot dot-r"/><div className="dot dot-y"/><div className="dot dot-g"/>
                <div className="mb-url">jubaos.com/dashboard</div>
              </div>
              <div className="mb-body">
                <div className="mb-sidebar">
                  <div className="mb-logo"><div className="mb-li"/><div className="mb-lt"/></div>
                  {[true,false,false,false,false].map((a,i)=>(
                    <div key={i} className={`mb-ni${a?' a':''}`}><div className="mb-ic"/><div className="mb-nt"/></div>
                  ))}
                </div>
                <div className="mb-main">
                  <div className="mb-stats">
                    {[true,false,false].map((f,i)=>(
                      <div key={i} className="mb-sc">
                        <div className="mb-st"><div className="mb-sd" style={f?{}:{background:'rgba(255,255,255,.07)'}}/><div className="mb-sl"/></div>
                        <div className="mb-sn"/><div className="mb-ss"/>
                      </div>
                    ))}
                  </div>
                  <div className="mb-appts">
                    {[['pend','Agendado'],['','Concluído'],['pend','Agendado']].map(([cls,lbl],i)=>(
                      <div key={i} className="mb-appt">
                        <div className="mb-av" style={i>0?{background:'rgba(255,255,255,.07)'}:{}}/>
                        <div className="mb-ai"><div className="mb-an"/><div className="mb-as"/></div>
                        <div className={`mb-badge${cls?' '+cls:''}`}>{lbl}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="fl-badge">
              <div className="fl-ic">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
              </div>
              <div><div className="fl-num">+42%</div><div className="fl-lbl">Faturamento este mês</div></div>
            </div>
            <div className="fl-badge2">
              <div className="fl-dot"/><span>Sistema online agora</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── PROBLEMA ── */}
      <section className="prob-bg" id="problem">
        <div className="container">
          <div className="two-col">
            <div>
              <div className="sec-hdr reveal">
                <span className="badge sec-badge" style={{background:'rgba(239,68,68,.1)',color:'#f87171',borderColor:'rgba(239,68,68,.2)'}}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  O problema
                </span>
                <h2 className="sec-title">A gestão manual<br/>custa caro</h2>
                <p className="sec-sub">Caderno, WhatsApp, papelzinho... a maioria das barbearias ainda perde tempo e dinheiro com métodos desorganizados.</p>
              </div>
              <div className="prob-list">
                {[
                  ['M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z','M9.09 9l5.82 6M14.91 9l-5.82 6','Conflito de horários','Dois clientes marcados para o mesmo horário. Confusão, reclamação e cliente perdido.'],
                  ['M12 2a10 10 0 110 20 10 10 0 010-20z','','Horários perdidos sem aviso','Cliente esqueceu, não avisou, e você ficou esperando sem aproveitar o tempo.'],
                  ['M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6','','Sem controle financeiro','Não sabe quanto faturou, quais serviços rendem mais, nem como o mês foi.'],
                  ['M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2','circle cx="9" cy="7" r="4"','Histórico de clientes inexistente','Não lembra o que o cliente pediu na última vez, preferências ou contato.'],
                ].map(([d,d2,title,desc],i)=>(
                  <div key={i} className={`prob-item reveal d${i+1}`}>
                    <div className="prob-ico">
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d={d}/>{d2 && <path d={d2}/>}
                      </svg>
                    </div>
                    <div><h4>{title}</h4><p>{desc}</p></div>
                  </div>
                ))}
              </div>
            </div>
            <div className="reveal">
              <div className="chaos-card">
                <div className="chaos-ttl">⚠️ Agenda Manual — conflitos detectados</div>
                <div className="chaos-rows">
                  {[[false,false,true,'f'],[true,'x','x',false],[false,false,'f','x'],[true,false,false,true]].map((row,i)=>(
                    <div key={i} className="chaos-row">
                      {row.map((t,j)=>(
                        <div key={j} className={`cc${t==='x'?' x':t==='f'?' f':''}`}/>
                      ))}
                    </div>
                  ))}
                </div>
                <p style={{fontSize:'11px',color:'#f87171',marginTop:'10px',display:'flex',alignItems:'center',gap:'5px'}}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  3 conflitos de horário detectados
                </p>
              </div>
              <div className="chaos-card" style={{borderColor:'rgba(239,68,68,.1)',marginTop:'14px'}}>
                <div className="chaos-ttl">📱 WhatsApp — 47 mensagens não lidas</div>
                {['"Pode marcar pra hoje às 15h?"','"Qual o valor do corte + barba?"'].map((m,i)=>(
                  <div key={i} style={{background:'rgba(255,255,255,.04)',borderRadius:'7px',padding:'8px 11px',fontSize:'12px',color:'var(--muted)',marginBottom:'5px'}}>{m}</div>
                ))}
                <div style={{background:'rgba(239,68,68,.08)',borderRadius:'7px',padding:'8px 11px',fontSize:'12px',color:'#f87171'}}>"Você marcou pra mim ás 14h e até agora nada"</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SOLUÇÃO ── */}
      <section id="solution">
        <div className="container">
          <div className="two-col">
            {/* clean agenda preview */}
            <div className="reveal">
              <div style={{background:'var(--bgc)',border:'1px solid var(--bdr-b)',borderRadius:'15px',overflow:'hidden',boxShadow:'0 20px 60px rgba(0,0,0,.3)'}}>
                <div style={{background:'var(--bg2)',padding:'12px 16px',borderBottom:'1px solid var(--bdr)',display:'flex',alignItems:'center',gap:'7px'}}>
                  <div style={{width:'9px',height:'9px',borderRadius:'50%',background:'#ff5f57'}}/>
                  <div style={{width:'9px',height:'9px',borderRadius:'50%',background:'#ffbd2e'}}/>
                  <div style={{width:'9px',height:'9px',borderRadius:'50%',background:'#28c840'}}/>
                  <span style={{fontSize:'11px',color:'var(--muted)',marginLeft:'7px'}}>✅ Agenda JubaOS</span>
                </div>
                <div style={{padding:'18px'}}>
                  {[
                    ['09:00','Carlos Alves','Corte + Barba · R$ 55','agendado',true],
                    ['10:30','Lucas Ferreira','Degradê · R$ 45','concluído',false],
                    ['14:00','Pedro Santos','Corte Navalhado · R$ 50','agendado',false],
                  ].map(([time,name,svc,status,hi],i)=>(
                    <div key={i} style={{display:'flex',alignItems:'center',gap:'10px',
                      background:hi?'rgba(124,58,237,.06)':'var(--bg2)',
                      border:`1px solid ${hi?'var(--bdr-b)':'var(--bdr)'}`,
                      borderRadius:'9px',padding:'9px 12px',marginBottom:'8px'}}>
                      <span style={{fontSize:'12px',fontWeight:'700',color:'var(--brand-l)',width:'34px'}}>{time}</span>
                      <div style={{width:'26px',height:'26px',borderRadius:'50%',background:'rgba(124,58,237,.2)',flexShrink:'0'}}/>
                      <div style={{flex:1}}>
                        <div style={{fontSize:'12px',fontWeight:'600'}}>{name}</div>
                        <div style={{fontSize:'10px',color:'var(--muted)'}}>{svc}</div>
                      </div>
                      <span style={{padding:'2px 8px',borderRadius:'99px',fontSize:'9px',fontWeight:'700',
                        background:status==='concluído'?'rgba(34,197,94,.1)':'rgba(124,58,237,.1)',
                        color:status==='concluído'?'#4ade80':'var(--brand-l)',
                        border:`1px solid ${status==='concluído'?'rgba(34,197,94,.2)':'rgba(124,58,237,.2)'}`}}>
                        {status.toUpperCase()}
                      </span>
                    </div>
                  ))}
                  <div style={{display:'flex',justifyContent:'space-between',marginTop:'12px',paddingTop:'12px',borderTop:'1px solid var(--bdr)'}}>
                    <span style={{fontSize:'11px',color:'var(--muted)'}}>3 agendamentos hoje</span>
                    <span style={{fontSize:'12px',fontWeight:'700',color:'#4ade80'}}>R$ 150 garantidos</span>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <div className="sec-hdr reveal">
                <span className="badge sec-badge">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                  A solução
                </span>
                <h2 className="sec-title">Tudo que sua<br/><span className="gt">barbearia precisa</span></h2>
                <p className="sec-sub">Um sistema completo, intuitivo e pensado para o dia a dia de quem trabalha com barbearia.</p>
              </div>
              <div className="sol-list">
                {[
                  ['Agenda digital inteligente','Controle visual de horários, bloqueios e recorrências para toda a equipe.'],
                  ['Base de clientes completa','Histórico de cada cliente, preferências, contato e anotações sempre disponíveis.'],
                  ['Controle financeiro detalhado','Relatórios de faturamento, serviços mais vendidos e evolução de receita.'],
                  ['Gestão de equipe','Cada barbeiro com seu acesso, agenda própria e desempenho individual.'],
                ].map(([title,desc],i)=>(
                  <div key={i} className={`sol-item reveal d${i+1}`}>
                    <div className="sol-chk">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                    </div>
                    <div><h4>{title}</h4><p>{desc}</p></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="feat-bg" id="features">
        <div className="container">
          <div className="sec-hdr ctr reveal">
            <span className="badge sec-badge">Funcionalidades</span>
            <h2 className="sec-title">Tudo que você precisa,<br/><span className="gt">em um só lugar</span></h2>
            <p className="sec-sub">Do agendamento ao relatório financeiro — o JubaOS tem tudo integrado para gerenciar sua barbearia sem complicação.</p>
          </div>
          <div className="feat-grid">
            {[
              { icon:'M3 4h18v18H3zM16 2v4M8 2v4M3 10h18', d2:'', title:'Agenda Inteligente', desc:'Visualize todos os agendamentos do dia, semana ou mês. Recorrências automáticas e bloqueios de horário.', tag:'Essencial', tagCls:'' },
              { icon:'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2', d2:'circle cx="9" cy="7" r="4"', title:'Gestão de Clientes', desc:'Cadastro completo com nome, telefone, e-mail e histórico. Busca instantânea na hora de agendar.', tag:'Essencial', tagCls:'' },
              { icon:'M6 2v8l4 4-4 4v4', d2:'M18 2v8l-4 4 4 4v4', title:'Cadastro de Serviços', desc:'Liste todos os serviços com preço, duração e ícone personalizado. Fácil de encontrar na criação do agendamento.', tag:'Essencial', tagCls:'' },
              { icon:'M18 20V10M12 20V4M6 20v-6', d2:'', title:'Relatórios de Faturamento', desc:'Receita diária, mensal e anual. Veja quais serviços rendem mais e tome decisões com dados reais.', tag:'Financeiro', tagCls:'' },
              { icon:'M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2', d2:'circle cx="12" cy="7" r="4"', title:'Controle de Equipe', desc:'Cada barbeiro com login próprio. Admin visualiza toda equipe; barbeiros gerenciam apenas sua agenda.', tag:'Equipe', tagCls:'' },
              { icon:'M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z', d2:'', title:'Integração WhatsApp', desc:'Envie lembretes automáticos de agendamento para seus clientes via WhatsApp. Reduza as faltas.', tag:'Em breve', tagCls:'new', icoEx:'green' },
              { icon:'M12 6v6l4 2', d2:'', title:'Agendamentos Recorrentes', desc:'Clientes frequentes com agendamentos semanais, quinzenais ou mensais criados de uma só vez.', tag:'Automação', tagCls:'', icoEx:'purple' },
              { icon:'M3 11V7a5 5 0 0110 0v4', d2:'M21 22H3v-11h18z', title:'Bloqueio de Agenda', desc:'Bloqueie horários por barbeiro ou para toda a equipe em feriados, reuniões e eventos.', tag:'Controle', tagCls:'' },
              { icon:'M12 2a10 10 0 110 20 10 10 0 010-20z', d2:'', title:'Automação com IA', desc:'Sugestões inteligentes de horários, análise de tendências e relatórios automáticos com insights.', tag:'Em breve', tagCls:'soon', icoEx:'purple' },
            ].map(({icon,d2,title,desc,tag,tagCls,icoEx},i)=>(
              <div key={i} className={`feat-card reveal d${(i%3)+1}`}>
                <div className={`feat-ico${icoEx?' '+icoEx:''}`}>
                  <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d={icon}/>{d2 && <path d={d2}/>}
                  </svg>
                </div>
                <h3>{title}</h3>
                <p>{desc}</p>
                <span className={`feat-tag${tagCls?' '+tagCls:''}`}>{tag}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── DEMO ── */}
      <section id="demo">
        <div className="container">
          <div className="sec-hdr ctr reveal">
            <span className="badge sec-badge">Demonstração</span>
            <h2 className="sec-title">Veja o sistema<br/><span className="gt">em ação</span></h2>
            <p className="sec-sub">Interface moderna, intuitiva e rápida. Pronto para usar no computador ou celular.</p>
          </div>

          <div className="demo-tabs reveal">
            {[['dashboard','Dashboard'],['agenda','Agenda']].map(([k,l])=>(
              <button key={k} className={`demo-tab${activeTab===k?' act':''}`} onClick={()=>setActiveTab(k)}>{l}</button>
            ))}
          </div>

          {/* Dashboard */}
          <div className={`demo-screen${activeTab==='dashboard'?' act':''}`}>
            <div className="demo-bar">
              <div className="dot dot-r"/><div className="dot dot-y"/><div className="dot dot-g"/>
              <span className="demo-title-bar">JubaOS — Dashboard</span>
            </div>
            <div className="demo-body">
              <div className="demo-sb">
                <div className="d-logo"><div className="d-li"/><span className="d-lt">JubaOS</span></div>
                {[['M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z',true,'Dashboard'],
                  ['M3 4h18v18H3zM16 2v4M8 2v4M3 10h18',false,'Agenda'],
                  ['M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2',false,'Clientes'],
                  ['M6 2v8l4 4-4 4v4',false,'Serviços'],
                  ['M18 20V10M12 20V4M6 20v-6',false,'Relatórios'],
                ].map(([d,a,lbl],i)=>(
                  <div key={i} className={`d-nav${a?' act':''}`}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={d}/></svg>
                    <span>{lbl}</span>
                  </div>
                ))}
              </div>
              <div className="demo-main">
                <div className="d-stats">
                  {[['Faturamento hoje','R$ 680','↑ 12%'],['Atendimentos','14','hoje'],['Clientes novos','3','semana'],['Mês atual','R$ 9.4k','↑ 8%']].map(([l,v,s],i)=>(
                    <div key={i} className="d-stat">
                      <div className="d-slbl">{l}</div>
                      <div className="d-sval">{v}</div>
                      <div className="d-ssub">{s}</div>
                    </div>
                  ))}
                </div>
                <div className="d-row">
                  <div className="d-card">
                    <div className="d-ctitle">Faturamento semanal</div>
                    <div className="d-bars">
                      {[40,65,50,85,70,55,45].map((h,i)=>(
                        <div key={i} className={`d-bar${i===3?' hl':''}`} style={{height:`${h}%`}}/>
                      ))}
                    </div>
                    <div className="d-xlbls">
                      {['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'].map((d,i)=>(
                        <span key={i} className={`d-xl${i===3?' hl':''}`}>{d}</span>
                      ))}
                    </div>
                  </div>
                  <div className="d-card">
                    <div className="d-ctitle">Próximos</div>
                    <div className="d-list">
                      {[['Carlos A.','09:00'],['Lucas F.','10:30'],['Pedro S.','14:00'],['Mateus R.','15:30']].map(([n,t],i)=>(
                        <div key={i} className="d-li-item">
                          <div className="d-dot" style={i===1?{background:'#4ade80'}:{}}/>
                          {n} — {t}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Agenda */}
          <div className={`demo-screen${activeTab==='agenda'?' act':''}`}>
            <div className="demo-bar">
              <div className="dot dot-r"/><div className="dot dot-y"/><div className="dot dot-g"/>
              <span className="demo-title-bar">JubaOS — Agenda</span>
            </div>
            <div className="demo-body">
              <div className="demo-sb">
                <div className="d-logo"><div className="d-li"/><span className="d-lt">JubaOS</span></div>
                {[['M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z',false,'Dashboard'],
                  ['M3 4h18v18H3zM16 2v4M8 2v4M3 10h18',true,'Agenda'],
                  ['M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2',false,'Clientes'],
                  ['M6 2v8l4 4-4 4v4',false,'Serviços'],
                ].map(([d,a,lbl],i)=>(
                  <div key={i} className={`d-nav${a?' act':''}`}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={d}/></svg>
                    <span>{lbl}</span>
                  </div>
                ))}
              </div>
              <div className="demo-main">
                <div className="ag-hdr">
                  <span className="ag-ttl">Terça-feira, 14 Mar</span>
                  <button className="ag-btn">+ Novo agendamento</button>
                </div>
                <div className="ag-list">
                  {[
                    ['09:00','Carlos Alves','Corte + Barba · João Silva · 55 min','pend'],
                    ['10:30','Lucas Ferreira','Degradê · Pedro Costa · 40 min',''],
                    ['14:00','Pedro Santos','Corte Navalhado · João Silva · 50 min','pend'],
                    ['15:30','Mateus Rodrigues','Pigmentação · Pedro Costa · 60 min','pend'],
                  ].map(([time,name,svc,st],i)=>(
                    <div key={i} className="ag-appt">
                      <span className="ag-time">{time}</span>
                      <div className="ag-av" style={i>0?{background:'rgba(255,255,255,.06)'}:{}}/>
                      <div className="ag-info"><div className="ag-name">{name}</div><div className="ag-svc">{svc}</div></div>
                      <span className={`ag-status${st?' '+st:''}`}>{st?'Agendado':'Concluído'}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── BENEFÍCIOS ── */}
      <section className="ben-bg" id="benefits">
        <div className="container">
          <div className="sec-hdr ctr reveal">
            <span className="badge sec-badge">Benefícios</span>
            <h2 className="sec-title">Por que usar<br/><span className="gt">o JubaOS?</span></h2>
          </div>
          <div className="ben-grid">
            {[
              ['01','Economize horas toda semana','Chega de responder mensagem por mensagem para confirmar horários. O sistema organiza tudo automaticamente, liberando seu tempo para o que importa.'],
              ['02','Zero conflito de horários','O sistema valida cada novo agendamento automaticamente, garantindo que nunca dois clientes sejam marcados para o mesmo horário.'],
              ['03','Aumente seu faturamento','Com relatórios detalhados você descobre quais serviços rendem mais, quais horários são mais movimentados e como crescer com inteligência.'],
              ['04','Profissionalize sua barbearia','Sistema moderno, visual bonito e organização impecável. Seus clientes e equipe vão perceber a diferença desde o primeiro dia.'],
            ].map(([num,title,desc],i)=>(
              <div key={i} className={`ben-card reveal d${(i%2)+1}`}>
                <div className="ben-num">{num}</div>
                <div><h3>{title}</h3><p>{desc}</p></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── DEPOIMENTOS ── */}
      <section id="testimonials">
        <div className="container">
          <div className="sec-hdr ctr reveal">
            <span className="badge sec-badge">Depoimentos</span>
            <h2 className="sec-title">O que dizem<br/><span className="gt">quem já usa</span></h2>
          </div>
          <div className="test-grid">
            {[
              {init:'JR',color:'rgba(124,58,237,.2)',tc:'var(--brand-l)',name:'João Rafael',role:'Barbearia JR, São Paulo',text:'"Antes controlava tudo no caderno e ainda assim perdia horário quase todo dia. Desde que usei o JubaOS, zero conflito e muito mais organização."'},
              {init:'MC',color:'rgba(96,165,250,.2)',tc:'#93c5fd',name:'Marcos Conceição',role:'MC Grooming, Rio de Janeiro',text:'"O relatório financeiro mudou como entendo meu negócio. Sei exatamente quais serviços vendem mais e quando o movimento é maior."'},
              {init:'AC',color:'rgba(74,222,128,.2)',tc:'#86efac',name:'André Carvalho',role:'Studio André C., BH',text:'"Minha equipe tem 4 barbeiros e agora cada um tem seu acesso. O admin vê tudo, cada barbeiro vê sua agenda. Simples e profissional."'},
            ].map(({init,color,tc,name,role,text},i)=>(
              <div key={i} className={`test-card reveal d${i+1}`}>
                <div className="stars">★★★★★</div>
                <p className="test-txt">{text}</p>
                <div className="test-auth">
                  <div className="test-av" style={{background:color,color:tc}}>{init}</div>
                  <div><div className="test-name">{name}</div><div className="test-role">{role}</div></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section>
        <div className="container">
          <div className="cta-box reveal">
            <span className="badge" style={{marginBottom:'18px'}}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
              Pronto para começar?
            </span>
            <h2 className="sec-title" style={{marginBottom:'12px'}}>
              Transforme sua barbearia<br/><span className="gt">a partir de hoje</span>
            </h2>
            <p className="sec-sub" style={{margin:'0 auto 36px'}}>
              Configure em minutos e comece a usar agora mesmo.
            </p>
            <div className="cta-btns">
              <Link to="/register" className="btn btn-p btn-lg" style={{fontSize:'17px',padding:'18px 38px'}}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
                Criar conta agora
              </Link>
              <Link to="/login" className="btn btn-o btn-lg">
                Já sou cliente — Entrar
              </Link>
            </div>
            <p className="cta-note">✓ Configuração em minutos &nbsp;·&nbsp; ✓ Suporte incluso &nbsp;·&nbsp; ✓ Dados protegidos</p>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer>
        <div className="container">
          <div className="ft-top">
            <div>
              <div className="logo">
                <div className="logo-icon">
                  <img src={jubaosLogo} alt="JubaOS" width="32" height="32" style={{objectFit:'contain',borderRadius:'22%'}}/>
                </div>
                <span className="gt">JubaOS</span>
              </div>
              <p className="ft-desc">O sistema de gestão mais moderno para barbearias. Organize sua agenda, clientes e finanças em um só lugar.</p>
              <div className="ft-socials">
                {[
                  'M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37zM21 2H3v20h18z',
                  'M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z',
                  'M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z',
                ].map((d,i)=>(
                  <a key={i} href="#" className="ft-soc">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={d}/></svg>
                  </a>
                ))}
              </div>
            </div>
            <div className="ft-col">
              <h4>Produto</h4>
              <ul>
                <li><a href="#features" onClick={e=>{e.preventDefault();scrollTo('features')}}>Funcionalidades</a></li>
                <li><a href="#demo"     onClick={e=>{e.preventDefault();scrollTo('demo')}}>Demonstração</a></li>
                <li><a href="#benefits" onClick={e=>{e.preventDefault();scrollTo('benefits')}}>Benefícios</a></li>
                <li><Link to="/register">Começar grátis</Link></li>
              </ul>
            </div>
            <div className="ft-col">
              <h4>Sistema</h4>
              <ul>
                <li><Link to="/login">Entrar</Link></li>
                <li><Link to="/register">Criar conta</Link></li>
                <li><Link to="/dashboard">Dashboard</Link></li>
                <li><Link to="/agenda">Agenda</Link></li>
              </ul>
            </div>
            <div className="ft-col">
              <h4>Suporte</h4>
              <ul>
                <li><a href="#">Central de ajuda</a></li>
                <li><a href="#">Contato</a></li>
                <li><a href="#">Privacidade</a></li>
                <li><a href="#">Termos de uso</a></li>
              </ul>
            </div>
          </div>
          <div className="ft-btm">
            <p>© 2025 JubaOS. Todos os direitos reservados.</p>
            <div className="ft-links">
              <a href="#">Privacidade</a>
              <a href="#">Termos</a>
              <a href="#">Contato</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
