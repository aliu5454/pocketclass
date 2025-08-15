// Dual-direction testimonial carousel using react-fast-marquee
import dynamic from 'next/dynamic';
import { useMemo, useEffect, useState } from 'react';
import { db } from '/firebaseConfig';
import { collection, query, orderBy, limit, getDocs, where } from 'firebase/firestore';
const Marquee = dynamic(() => import('react-fast-marquee'), { ssr: false });

function InstructorFinderView() {
  const parentsTestimonials = [
    {
      name: "Laura Milton",
      date: "2 months ago",
      review: "Maila is the best!! She is so supportive and gives so many variations for whatever level you are at in her class. She helped me fix my positioning on one of the exercises and it completely helped my posture and confidence in the exercise! Would highly recommend!! ❤️❤️",
      taughtBy: "Maila",
      avatar: "https://randomuser.me/api/portraits/women/11.jpg"
    },
    {
      name: "Cindy Huh",
      date: "6 months ago",
      review: "I was a total beginner when it came to golf and Wit really took the time to show me how to hold the club and angle my posture. After just 1 session with him I already feel like I have a great foundational understanding of the sport and can’t wait for my next class! :)",
      taughtBy: "Wit",
      avatar: "https://randomuser.me/api/portraits/women/35.jpg"
    },
    {
      name: "Lisa Huh",
      date: "6 months ago",
      review: "Sean made everything easy to grasp and broke down the DJ basics in a way that felt really approachable for a beginner. He’s super patient and brings great energy to every session— looking forward to continuing my lessons!",
      taughtBy: "Sean",
      avatar: "https://randomuser.me/api/portraits/women/26.jpg"
    },
    {
      name: "Hazel Nichol",
      date: "3 weeks ago",
      review: "Great class! Ethan brings great energy and all the vibes, he is a super enthusiastic and supportive coach! 10/10!",
      taughtBy: "Ethan",
      avatar: "https://randomuser.me/api/portraits/women/56.jpg"
    },
    {
      name: "Ben Huang",
      date: "6 months ago",
      review: "Mathias is a great PT. He fixed my chest press form and turns out my elbows were way too wide. I also asked him a ton of questions about nutrition and dieting, he definitely knows what he's talking about. Would recommend.",
      taughtBy: "Mathias",
      avatar: "https://randomuser.me/api/portraits/men/25.jpg"
    },
    {
      name: "Mikael Muria",
      date: "2 weeks ago",
      review: "Ethan always brings that energy. Be ready to put the work in and the results will follow. Very well thought out classes and always makes sure to check on your form throughout. 10/10 rating.",
      taughtBy: "Ethan",
      avatar: "https://randomuser.me/api/portraits/men/34.jpg"
    },
    {
      name: "Alyssa D",
      date: "2 weeks ago",
      review: "I worked with Julia on a 5 week progressive beginner class and she was very attentive and would adapt to the needs of the class, focusing on areas that people may be struggling with and needed to refine. She would give constructive and specific feedback that helped me progress exponentially! Highly recommend!",
      taughtBy: "Julia",
      avatar: "https://randomuser.me/api/portraits/women/87.jpg"
    },
    {
      name: "Kiki Huang",
      date: "2 months ago",
      review: "Such a fun class! It was my first time doing a rowformers class and although it was challenging it was a nice change from my usual fitness routine. Maila is super encouraging and knowledgeable, can’t wait to be back soon!",
      taughtBy: "Maila",
      avatar: "https://randomuser.me/api/portraits/women/44.jpg"
    },
    {
      name: "Andrew Liu",
      date: "6 months ago",
      review: "Wit was an amazing coach that taught me not only how to swing technically, but also how to swing confidently. His advice helped me gain consistency on the course and greatly reduced my score over the summer. I’d highly recommend his class to anyone looking to commit and improve their game drastically!",
      taughtBy: "Wit",
      avatar: "https://randomuser.me/api/portraits/men/24.jpg"
    },
    {
      name: "Judice Montana",
      date: "2 weeks ago",
      review: "Investing in a series of 4 private sessions with Julia was hands down the best decision I've made for my dancing. Julia excels at identifying the specific technical challenges holding you back. Her approach is both incredibly insightful and deeply kind, fostering a truly safe space where learning and making mistakes feels natural. Through her guidance, I learned so much – not only refining my technique but also gaining profound self-awareness as a dancer. The knowledge and confidence I gained have directly elevated every single dance class I've attended afterward. Julia is exceptional, and I highly, highly recommend her. You will not be disappointed!",
      taughtBy: "Julia",
      avatar: "https://randomuser.me/api/portraits/women/76.jpg"
    },
    {
      name: "Lucia Wan",
      date: "0 months ago",
      review: "I’ve had the absolute pleasure of learning from DJ Vanessa and I can’t recommend her enough! As a female DJ, she brings such a unique energy to her teaching — confident, creative, and super inspiring. She’s incredibly knowledgeable about mixing, transitions, and reading the crowd, but what really sets her apart is how patient and encouraging she is with her students. She creates a fun, supportive space where you’re not afraid to make mistakes or ask questions. I went from feeling unsure behind the decks to actually being excited to play and experiment, all thanks to her guidance. Whether you’re just starting out or looking to level up your skills, she’ll help you get there — and make you fall in love with DJing along the way. So grateful to have learned from her!",
      taughtBy: "DJ Vanessa",
      avatar: "https://randomuser.me/api/portraits/women/15.jpg"
    },
    {
      name: "Kevin Nisperos",
      date: "3 weeks ago",
      review: "Always a Vibe working out with Ethan and the City Sweats crew! Every exercise hit both controlled and explosive movements with great alternatives for those with possible injury. It’s never a workout when your vibin’ to great music and a supportive crew! LET’S GOOOOO!!! 🔥🔥🔥🔥",
      taughtBy: "Ethan",
      avatar: "https://randomuser.me/api/portraits/men/45.jpg"
    },
    {
      name: "Janet H",
      date: "3 weeks ago",
      review: "Been to several of Coach Delano’s classes and he delivers every time! His workouts are thoughtfully curated, challenging yet still suitable for all levels (with mods as needed). Delano is an up and rising community lead and an elite athlete. His classes are always uplifting, dynamic and his positive energy is contagious!",
      taughtBy: "Delano",
      avatar: "https://randomuser.me/api/portraits/women/23.jpg"
    },
    {
      name: "Andrew Liu",
      date: "6 months ago",
      review: "Mathias was really great with teaching me how to properly warm up my joints before doing heavy movements & workouts. I especially appreciated his attention to detail and ability to see exactly how my form can improve. He was also great in helping my mentality for each set, focusing primarily on quality and loading each set correctly to reach my body goals. Would highly recommend!!",
      taughtBy: "Mathias",
      avatar: "https://randomuser.me/api/portraits/men/14.jpg"
    },
    {
      name: "Sandhiya R",
      date: "1 week ago",
      review: "I have taken drop-in dance classes with Julia as well as her dance Fundamentals course. Her style of teaching was super clear and helpful, especially when training fundamental movements in Jazz funk/commercial styles. I really recommend her classes!",
      taughtBy: "Julia",
      avatar: "https://randomuser.me/api/portraits/women/21.jpg"
    },
    {
      name: "Andrea Lim",
      date: "2 weeks ago",
      review: "I attended a small group session led by Julia and learned a lot just within those few hours! She led us through several drills that worked on our foundational technique including grooves, turns and isolations. Attentive and observant, Julia quickly spotted my mistakes and corrected them. I feel really fortunate to have Julia as a teacher, as she is truly devoted to helping students improve, and always delivers feedback kindly and constructively.",
      taughtBy: "Julia",
      avatar: "https://randomuser.me/api/portraits/women/65.jpg"
    },
    {
      name: "Andrew Liu",
      date: "5 months ago",
      review: "Great class!",
      taughtBy: "Wit",
      avatar: "https://randomuser.me/api/portraits/men/57.jpg"
    },
    {
      name: "Sarah Padwal",
      date: "2 weeks ago",
      review: "Julia is a great instructor who can really help to refine fundamentals in dance!! I would highly recommend to anyone who is just starting out in jazz funk/open styles, or who wants to revisit basic movement and get personalized feedback.",
      taughtBy: "Julia",
      avatar: "https://randomuser.me/api/portraits/women/10.jpg"
    },
    {
      name: "Anna Maria Li",
      date: "1 week ago",
      review: "This is perfect for anyone who wants to work on fundamentals in jazz funk. It was so helpful getting specific feedback from Julia in a small class environment. I’ve learned more in one class than weeks of drop-in classes.",
      taughtBy: "Julia",
      avatar: "https://randomuser.me/api/portraits/women/43.jpg"
    },
    {
      name: "Claire Wang",
      date: "2 months ago",
      review: "It was my first time trying reformer Pilates, thanks to the best instructor Maila making it fun and challenging at the same time. I will definitely come back for the next session with Maila!",
      taughtBy: "Maila",
      avatar: "https://randomuser.me/api/portraits/women/66.jpg"
    },
    {
      name: "Reesha N",
      date: "2 months ago",
      review: "The absolute best instructor! You’re missing out if you haven’t already signed up for a class with Maila! Best atmosphere, the best workout and instructor- and the best crowd/community. So happy to be proud of the family Maila is building!",
      taughtBy: "Maila",
      avatar: "https://randomuser.me/api/portraits/women/22.jpg"
    },
    {
      name: "Ben Huang",
      date: "5 months ago",
      review: "Helpful tips that actually made a difference.",
      taughtBy: "Wit",
      avatar: "https://randomuser.me/api/portraits/men/68.jpg"
    },
    {
      name: "Aatrayee B",
      date: "2 weeks ago",
      review: "I did Julia’s five-week fundamentals training and honestly, it was totally worth it. Her classes are great for all dance levels, and she creates such a supportive and welcoming vibe. I really noticed an improvement in my dance fundamentals thanks to her clear teaching and encouraging approach.",
      taughtBy: "Julia",
      avatar: "https://randomuser.me/api/portraits/women/32.jpg"
    },
    {
      name: "Lisa H",
      date: "2 months ago",
      review: "Maila is the best! This was my first time at STRONG Pilates (Beaches), and I absolutely loved it. I've always been a fan of Reformer, but this class took it to another level. Maila's energy made the whole experience. I’m already looking forward to my next session with Maila!",
      taughtBy: "Maila",
      avatar: "https://randomuser.me/api/portraits/women/33.jpg"
    },
    {
      name: "Ben Huang",
      date: "5 months ago",
      review: "Had a really bad slice on my driver and Wit fixed it in one session.",
      taughtBy: "Wit",
      avatar: "https://randomuser.me/api/portraits/men/46.jpg"
    },
    {
      name: "Matthew Manuel",
      date: "6 months ago",
      review: "Had a great experience with Sean and the others. Had no prior experience with CDJ’s before this but I learned a lot from this class alone. Everyone was friendly, fun and welcoming and I would definitely come back for another class or event.",
      taughtBy: "Sean",
      avatar: "https://randomuser.me/api/portraits/men/16.jpg"
    },
    {
      name: "Ethan Delano",
      date: "2 months ago",
      review: "Amazing class and experience with Maila! A great class, definitely tough & she made us work for it and great energy all throughout!",
      taughtBy: "Maila",
      avatar: "https://randomuser.me/api/portraits/men/55.jpg"
    },
    {
      name: "Lisette Abines",
      date: "1 week ago",
      review: "Julia was my first-ever dance teacher at DLX, and I feel incredibly lucky that I got to start my journey with her. I trained under her for about a year, and even though I've been dancing for two years, the growth I experienced during my time in her programs and drop-in classes was huge. Julia creates such an encouraging environment where it feels safe to make mistakes and look silly. Whether it was through drills, foundations or choreography, I always felt class feeling inspired and pushed in the best way possible. Overall, I'm super grateful for everything she's taught me so far and for helping me build my foundation as a dancer. Julia is phenomenal! Take the opportunity to learn from her when you can!!!",
      taughtBy: "Julia",
      avatar: "https://randomuser.me/api/portraits/women/54.jpg"
    },
    {
      name: "Amanda Edison",
      date: "3 weeks ago",
      review: "I recently attended coach Ethan’s Lif’ up class. He truly put on an epic event, Im so glad I went. From the killer workout, to the amazing dj’s playing soca music just in time for Caribana coming up, to the vendors, the free goodies, the photographers shooting content, the challenges & prizes….WELL DONE, Ethan! 👏🏼 👏🏼 I truly cant wait for the next one!!",
      taughtBy: "Ethan",
      avatar: "https://randomuser.me/api/portraits/women/12.jpg"
    },
    {
      name: "Jeffrey Song",
      date: "6 months ago",
      review: "Coach Wit is goated, I was slicing like crazy, and he spotted the problem right away. After a few tweaks, my shots were straighter than ever. Super easy to work with and explains things in a way that I was able to understand right away. Highly recommend.",
      taughtBy: "Wit",
      avatar: "https://randomuser.me/api/portraits/men/13.jpg"
    }
  ]

  // State maps to store real avatars
  const [reviewerPhotoMap, setReviewerPhotoMap] = useState({}); // { reviewerName: photoUrl }
  const [instructorPhotoMap, setInstructorPhotoMap] = useState({}); // { instructorName: photoUrl }
  const [enriched, setEnriched] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch recent reviews to get actual reviewer photos
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const q = query(collection(db, 'Reviews'), orderBy('createdAt', 'desc'), limit(150));
        const snap = await getDocs(q);
        const map = {};
        snap.docs.forEach(d => {
          const data = d.data();
          if (data?.name && (data.photo || data.avatar)) {
            map[data.name.trim()] = data.photo || data.avatar;
          }
        });
        if (isMounted) setReviewerPhotoMap(map);
      } catch (e) {
        console.warn('Review photo fetch failed', e);
      }
    })();
    return () => { isMounted = false; };
  }, []);

  // Fetch instructor profile images (handpicked taughtBy names)
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const taughtBySet = Array.from(new Set(parentsTestimonials.map(t => t.taughtBy).filter(Boolean)));
        // Simple fetch of all instructors, then filter locally (avoid N queries)
        const q = query(collection(db, 'Users'), where('isInstructor', '==', true));
        const snap = await getDocs(q);
        const map = {};
        snap.docs.forEach(d => {
          const data = d.data();
            const fullName = [data.firstName, data.lastName].filter(Boolean).join(' ').trim();
            const photo = data.profileImage || data.photoURL || data.avatar;
            if (!photo) return;
            taughtBySet.forEach(tb => {
              const tbLower = tb.toLowerCase();
              if (fullName.toLowerCase().includes(tbLower) || (data.firstName && data.firstName.toLowerCase() === tbLower)) {
                map[tb] = photo;
              }
            });
        });
        if (isMounted) setInstructorPhotoMap(map);
      } catch (e) {
        console.warn('Instructor photo fetch failed', e);
      }
    })();
    return () => { isMounted = false; };
  }, []);

  // Enrich testimonials once we have maps
  useEffect(() => {
    const isRandom = (url) => typeof url === 'string' && url.includes('randomuser.me');
    const updated = parentsTestimonials.map(t => {
      let avatar = reviewerPhotoMap[t.name] || instructorPhotoMap[t.taughtBy] || t.avatar;
      // Prefer replacing random placeholders with a real image if available
      if (isRandom(t.avatar) && (reviewerPhotoMap[t.name] || instructorPhotoMap[t.taughtBy])) {
        avatar = reviewerPhotoMap[t.name] || instructorPhotoMap[t.taughtBy];
      }
      return { ...t, avatar };
    });
    setEnriched(updated);
    setLoading(false);
  }, [parentsTestimonials, reviewerPhotoMap, instructorPhotoMap]);


  // Split testimonials into two rows (alternating) for continuous opposite direction scrolling
  const { topRow, bottomRow } = useMemo(() => {
    const top = [];
    const bottom = [];
    (enriched.length ? enriched : parentsTestimonials).forEach((t, i) => (i % 2 === 0 ? top : bottom).push(t));
    // Duplicate shorter row to maintain balance & seamless loop
    if (top.length && bottom.length && Math.abs(top.length - bottom.length) > 1) {
      const shorter = top.length < bottom.length ? top : bottom;
      shorter.push(...shorter);
    }
    return { topRow: top, bottomRow: bottom };
  }, [parentsTestimonials, enriched]);

  const Card = ({ item }) => (
    <div className="w-[280px] md:w-[310px] lg:w-[340px] h-72 shrink-0 bg-white border border-gray-200 rounded-xl flex flex-col mr-5 overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 text-[#1e1e1e]">
      <div className="p-5 pb-3 flex flex-col flex-1 ">
        <div className="flex items-center justify-between text-[11px] text-gray-600 mb-2 shrink-0">
          <span className="font-medium">{item.name || 'Anonymous'}</span>
          {item.date && <span>{item.date}</span>}
        </div>
        <p className="text-[13px] leading-relaxed text-gray-800 overflow-hidden line-clamp-6 flex-1">
          {item.review}
        </p>
      </div>
      <div className="flex items-center gap-3 px-5 py-3 bg-gray-50 border-t border-gray-200 shrink-0">
        {item.avatar ? (
          <img src={item.avatar} alt={item.name} className="w-9 h-9 rounded-full object-cover ring-2 ring-gray-200" />
        ) : (
          <div className="w-9 h-9 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center text-xs font-semibold text-gray-700 uppercase ring-2 ring-gray-200">
            {(item.name || 'NA').slice(0, 2)}
          </div>
        )}
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-gray-800">{item.name || 'Anonymous'}</span>
          <span className="text-[11px] tracking-wide text-gray-600">Coached by {item.taughtBy}</span>
        </div>
      </div>
    </div>
  );

  return (
    // Full-bleed section: spans entire viewport width with no side padding/margins while preventing horizontal scrollbar
    <section className="relative left-1/2 -translate-x-1/2 w-screen py-14 md:py-20 bg-orange-25 overflow-x-hidden">
      {/* Dynamic radial pattern background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_25%_25%,rgba(255,165,0,0.12),transparent_40%)]" />
        <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(circle_at_75%_15%,rgba(255,140,0,0.08),transparent_35%)]" />
        <div className="absolute bottom-0 left-0 w-full h-full bg-[radial-gradient(circle_at_15%_85%,rgba(255,200,87,0.10),transparent_45%)]" />
        <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(circle_at_85%_75%,rgba(255,178,102,0.09),transparent_40%)]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(ellipse_at_center,rgba(255,220,180,0.06),transparent_60%)]" />
      </div>
      {/* Floating geometric shapes */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-10 w-32 h-32 rounded-full bg-orange-200/20 blur-xl" />
        <div className="absolute top-40 right-20 w-24 h-24 rounded-full bg-amber-200/15 blur-lg" />
        <div className="absolute bottom-32 left-1/4 w-40 h-40 rounded-full bg-orange-100/25 blur-2xl" />
        <div className="absolute bottom-20 right-1/3 w-28 h-28 rounded-full bg-yellow-200/20 blur-xl" />
      </div>
      <div className="text-center max-w-2xl mx-auto mb-12 px-4 md:px-0 relative z-10">
        <h2 className="text-2xl md:text-4xl font-extrabold tracking-tight text-[#261f22] drop-shadow-sm">Find the right instructor for you</h2>
        <p className="mt-4 text-base md:text-lg font-medium text-slate-700">With over 30 instructors and 100+ learners</p>
      </div>
      <div className="w-full flex flex-col relative z-10">
        {loading && (
          <div className="text-center text-xs tracking-wide text-gray-600 py-4">Loading testimonials...</div>
        )}
        {!loading && (
          <>
            <Marquee speed={40} gradient={false} className="mb-10">
              {topRow.map((item, i) => <Card key={`top-${i}`} item={item} />)}
            </Marquee>
            <Marquee speed={40} direction="right" gradient={false}>
              {bottomRow.map((item, i) => <Card key={`bottom-${i}`} item={item} />)}
            </Marquee>
          </>
        )}
      </div>
    </section>
  );
}

export default InstructorFinderView;
