import { ArrowLeft, PawPrint } from 'lucide-react';
export default function NotFound() {
 return <main className="storefront" style={{minHeight:'100dvh',display:'grid',placeItems:'center',padding:24}}><div className="empty-state" style={{maxWidth:480}}><PawPrint size={54}/><span className="overline">404 · A LITTLE OFF THE TRAIL</span><h1 style={{fontSize:48,margin:'22px 0'}}>This way back<br/><em>to the good stuff.</em></h1><p>We couldn’t find that page. Your next little favorite is waiting back at the shop.</p><a className="store-button" href="/"><ArrowLeft size={17}/> Back to PawPass</a></div></main>;
}
