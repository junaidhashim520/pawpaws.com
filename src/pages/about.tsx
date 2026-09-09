import { useEffect } from 'react';
import { ArrowRight, Check, Clock3, HeartHandshake, Home, MapPin, PawPrint, ShieldCheck, ShoppingBag, Sparkles, Users } from 'lucide-react';
import './about.css';

const services = [
  {
    icon: Home,
    title: 'Pet sitting and home visits',
    text: 'When you travel, work late, or cannot be home, a trusted caregiver can visit your pet in their familiar environment for company, meals, medication reminders, play, and a calm check-in.',
  },
  {
    icon: PawPrint,
    title: 'Dog walking and exercise',
    text: 'Safe, thoughtful walks help dogs get fresh air, movement, enrichment, and attention when your routine is too full for the walk they deserve.',
  },
  {
    icon: Sparkles,
    title: 'Grooming and everyday care',
    text: 'Simple grooming support helps pets feel comfortable and cared for, from a fresh tidy-up to regular routines that are easy for busy pet parents to maintain.',
  },
  {
    icon: ShoppingBag,
    title: 'Pet essentials in one place',
    text: 'Find practical food, toys, beds, bowls, walking gear, and other carefully chosen essentials for dogs, cats, birds, rabbits, and every kind of companion.',
  },
];

const reasons = [
  'You are going out of town and need someone dependable to care for your pet.',
  'Work, school, travel, or a busy daily routine makes regular walks and visits difficult.',
  'Your pet is happier at home and needs familiar surroundings instead of a stressful change.',
  'You need everyday supplies and a helping hand from one pet-focused place.',
];

export default function AboutPage() {
  useEffect(() => {
    document.title = 'About PawPass | Pet Care, Pet Sitting and Everyday Essentials';
    const description = 'PawPass helps busy pet parents with pet sitting, home visits, dog walking, grooming support, and thoughtfully chosen pet essentials when life gets busy or you need to go away.';
    let tag = document.querySelector('meta[name="description"]');
    if (!tag) { tag = document.createElement('meta'); tag.setAttribute('name', 'description'); document.head.appendChild(tag); }
    tag.setAttribute('content', description);
    return () => { document.title = 'PawPass — The little pet shop & care corner'; };
  }, []);
  return <div className="about-page">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ '@context': 'https://schema.org', '@type': 'PetStore', name: 'PawPass', description: 'Pet essentials and caring support for busy pet parents, including pet sitting, home visits, dog walking, and grooming support.', url: 'https://junaidhashim520.github.io/pawpaws.com/about' }) }} />
    <header className="about-header">
      <div className="about-container about-header-inner">
        <a className="about-brand" href="/" aria-label="PawPass home"><PawPrint size={24} fill="currentColor" /> <span>pawpass<sup>®</sup></span></a>
        <nav aria-label="About page navigation">
          <a href="/">Shop</a>
          <a className="about-current" href="/about" aria-current="page">About PawPass</a>
          <a href="/#care">Pet care</a>
        </nav>
        <a className="about-header-action" href="/#shop">Explore the shop <ArrowRight size={16} /></a>
      </div>
    </header>

    <main>
      <section className="about-hero">
        <div className="about-container about-hero-grid">
          <div>
            <span className="about-eyebrow">ABOUT PAWPASS · PET SHOP & CARE SERVICES</span>
            <h1>A better day for pets.<br /><em>A little more help for you.</em></h1>
            <p className="about-lede">PawPass brings trusted pet essentials and thoughtful care services together for people who want the very best for their companions, even when life gets busy.</p>
            <div className="about-actions"><a className="about-primary" href="/#care">Find pet care <ArrowRight size={17} /></a><a className="about-secondary" href="/#shop">Shop pet essentials</a></div>
          </div>
          <div className="about-hero-card"><img src="/pawpass-dog.png" alt="A happy dog relaxing while their person gets help from PawPass" /><span><HeartHandshake size={18} /> Care that fits real life.</span></div>
        </div>
      </section>

      <section className="about-section about-intro" aria-labelledby="what-is-pawpass">
        <div className="about-container about-two-column"><div><span className="about-eyebrow">WHAT IS PAWPASS?</span><h2 id="what-is-pawpass">The everyday support system for your favorite companion.</h2></div><div><p>PawPass is a pet care and pet supplies service designed around one simple truth: pets are family, and caring for family does not stop when your calendar fills up.</p><p>We help pet parents keep their companions happy, healthy, entertained, and comfortable. That means useful products for everyday life, plus reliable care when you are at work, away from home, traveling, or simply need an extra pair of caring hands.</p><p>Our goal is to make pet ownership feel less stressful and more joyful, with clear options, compassionate people, and care that respects each pet's personality and routine.</p></div></div>
      </section>

      <section className="about-section about-services" aria-labelledby="services-title">
        <div className="about-container"><div className="about-section-heading"><div><span className="about-eyebrow">WHAT WE PROVIDE</span><h2 id="services-title">Practical help for the whole little world they live in.</h2></div><p>From a last-minute visit to the food bowl and walking gear they use every day, PawPass is built to support real pet-parent routines.</p></div><div className="about-service-grid">{services.map(({ icon: Icon, title, text }) => <article className="about-service" key={title}><span className="about-service-icon"><Icon size={25} /></span><h3>{title}</h3><p>{text}</p><a href="/#care">Learn about care <ArrowRight size={14} /></a></article>)}</div></div>
      </section>

      <section className="about-section about-problem" aria-labelledby="problem-title">
        <div className="about-container about-problem-grid"><div><span className="about-eyebrow">MADE FOR BUSY PET PARENTS</span><h2 id="problem-title">Going out should not mean worrying about them.</h2><p>It is normal to feel concerned when you have plans, a long shift, a trip, or an unexpected change in your schedule. PawPass helps close that gap with care options that keep pets safe, comfortable, and connected to their normal routine.</p></div><ul>{reasons.map(reason => <li key={reason}><Check size={18} /> <span>{reason}</span></li>)}</ul></div>
      </section>

      <section className="about-section about-standard" aria-labelledby="standard-title">
        <div className="about-container about-standard-grid"><div><span className="about-eyebrow">OUR PROMISE</span><h2 id="standard-title">Care should feel personal, clear, and dependable.</h2></div><div className="about-promise-list"><div><ShieldCheck size={22} /><div><h3>Pet-first decisions</h3><p>We put comfort, safety, personality, and familiar routines at the center of every recommendation.</p></div></div><div><Users size={22} /><div><h3>Support for real people</h3><p>We make it easier for pet parents to ask for help without guilt when life becomes full.</p></div></div><div><Clock3 size={22} /><div><h3>Care that fits the day</h3><p>Flexible support is the point: care for planned travel, busy workdays, and the moments you did not expect.</p></div></div></div></div>
      </section>

      <section className="about-cta"><div className="about-container"><MapPin size={27} /><span className="about-eyebrow">A LITTLE HELP GOES A LONG WAY</span><h2>More time for life.<br /><em>More good days for them.</em></h2><p>Explore the PawPass shop or start with our interactive pet-care experience.</p><div className="about-actions"><a className="about-primary" href="/#care">Explore pet care <ArrowRight size={17} /></a><a className="about-secondary" href="/#shop">Browse essentials</a></div></div></section>
    </main>

    <footer className="about-footer"><div className="about-container"><a className="about-brand" href="/"><PawPrint size={21} fill="currentColor" /> <span>pawpass<sup>®</sup></span></a><p>Pet essentials and caring support for every kind of companion.</p><span>© {new Date().getFullYear()} PawPass</span></div></footer>
  </div>;
}
