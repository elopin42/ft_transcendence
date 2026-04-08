import './landing.css';

export default function Home() {
  return (
    <div className="landing-wrapper">
      <img className="logo-topleft" src="/logomsp.png" alt="" />
      <div className="title-container">
        <h1 className="subtitle-backer">Friends, Fun, code &amp; Connect</h1>
        <h1 className="subtitle-front">Friends, Fun, code &amp; Connect</h1>
      </div>
      <div className="button">
        <a className="main-btn-msp pink-button" href="/setup">
          Play MovieStarParis 42
        </a>
        <div className="button-art">
          <img className="bling" src="/blingstar.png" style={{ top: '10%', left: '10%' }} alt="" />
          <img className="bling" src="/blingstar.png" style={{ top: '-15%', left: '15%' }} alt="" />
          <img className="bling" src="/blingstar.png" style={{ top: '-30%', left: '28%' }} alt="" />
          <img className="bling" src="/blingstar.png" style={{ bottom: '5%', right: '31%' }} alt="" />
          <img className="logo" src="/logomsp.png" style={{ top: '-35%', right: '0%' }} alt="" />
        </div>
      </div>
    </div>
  );
}
