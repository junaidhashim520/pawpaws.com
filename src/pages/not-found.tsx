import { ArrowLeft, PawPrint } from 'lucide-react';
export default function NotFound() {
 return <main className="storefront not-found-page"><div className="not-found-card"><span className="not-found-paw"><PawPrint size={38} fill="currentColor"/></span><span className="overline">404 · A LITTLE OFF THE TRAIL</span><h1>This way back<br/><em>to the good stuff.</em></h1><p>We couldn’t find that page. Your next little favorite is waiting back at the shop.</p><a className="store-button" href="/"><ArrowLeft size={17}/> Back to PawPass</a></div></main>;
}
