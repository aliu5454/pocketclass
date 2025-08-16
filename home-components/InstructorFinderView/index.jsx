"use client";

import dynamic from "next/dynamic";
import React, { useState, useEffect, useMemo, memo } from "react";

const Marquee = dynamic(() => import("react-fast-marquee"), { ssr: false });

// Placeholder (SVG data URI) used for broken/missing images
const PLACEHOLDER =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='96' height='96'><rect width='100%' height='100%' fill='%23E5E7EB'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='%236B7280' font-family='Arial' font-size='18'>NA</text></svg>";

// --- Small utility: repeat array (tile) until it's long enough to avoid marquee gaps ---
function tileArray(arr = [], minLen = 8, maxRepeatTimes = 6) {
  if (!arr || arr.length === 0) return arr;
  const result = [];
  let repeats = 0;
  while (result.length < minLen && repeats < maxRepeatTimes) {
    result.push(...arr);
    repeats++;
  }
  return result;
}

// --- Memoized Card to avoid rerenders ---
const Card = memo(function Card({ item }) {
  const imgSrc = item.avatar || PLACEHOLDER;

  return (
    <article
      role="listitem"
      aria-label={`Testimonial by ${item.name || "Anonymous"}`}
      className="w-[280px] md:w-[310px] lg:w-[340px] h-72 shrink-0 bg-white border border-gray-200 rounded-xl flex flex-col mr-5 overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 text-[#1e1e1e]"
    >
      <div className="p-5 pb-3 flex flex-col flex-1 ">
        <div className="flex items-center justify-between text-[11px] text-gray-600 mb-2 shrink-0">
          <span className="font-medium">{item.name || "Anonymous"}</span>
          {item.date && <span>{item.date}</span>}
        </div>
        <p className="text-[13px] leading-relaxed text-gray-800 overflow-hidden line-clamp-6 flex-1">
          {item.review}
        </p>
      </div>

      <div className="flex items-center gap-3 px-5 py-3 bg-gray-50 border-t border-gray-200 shrink-0">
        <img
          src={imgSrc}
          alt={item.name ? `${item.name} avatar` : "Reviewer avatar"}
          className="w-9 h-9 rounded-full object-cover ring-2 ring-gray-200"
          loading="lazy"
          width={36}
          height={36}
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = PLACEHOLDER;
          }}
        />
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-gray-800">{item.name || "Anonymous"}</span>
          <span className="text-[11px] tracking-wide text-gray-600">Coached by {item.taughtBy}</span>
        </div>
      </div>
    </article>
  );
});
Card.displayName = "Card";

export default function InstructorFinderView() {
  const parentsTestimonials = useMemo(
    () => [
      {
        "name": "Laura Milton",
        "date": "2 months ago",
        "review": "Maila is the best!! She is so supportive and gives so many variations for whatever level you are at in her class. She helped me fix my positioning on one of the exercises and it completely helped my posture and confidence in the exercise! Would highly recommend!! ❤️❤️",
        "taughtBy": "Maila",
        "avatar": "https://lh3.googleusercontent.com/a/ACg8ocKwPtu5ot19zRVTli5ObayaKJinkQTQ_kPxal4J0JXVWxILaI18Zg=s96-c"
      },
      {
        "name": "Cindy Huh",
        "date": "6 months ago",
        "review": "I was a total beginner when it came to golf and Wit really took the time to show me how to hold the club and angle my posture. After just 1 session with him I already feel like I have a great foundational understanding of the sport and can’t wait for my next class! :)",
        "taughtBy": "Wit",
        "avatar": "https://lh3.googleusercontent.com/a/ACg8ocJJqAY_cS3LrloPqhUdTZko200QZOxM0SJ8gIrDkAysur1m2w=s96-c"
      },
      {
        "name": "Lisa Huh",
        "date": "6 months ago",
        "review": "Sean made everything easy to grasp and broke down the DJ basics in a way that felt really approachable for a beginner. He’s super patient and brings great energy to every session— looking forward to continuing my lessons!",
        "taughtBy": "Sean",
        "avatar": "https://lh3.googleusercontent.com/a/AEdFTp4cOd7B08DKJW21iNv23nYPily-quyj2yjIJ6UM4g=s96-c"
      },
      {
        "name": "Hazel Nichol",
        "date": "3 weeks ago",
        "review": "Great class! Ethan brings great energy and all the vibes, he is a super enthusiastic and supportive coach! 10/10!",
        "taughtBy": "Ethan",
        "avatar": "https://static.vecteezy.com/system/resources/previews/019/879/186/non_2x/user-icon-on-transparent-background-free-png.png"
      },
      {
        "name": "Ben Huang",
        "date": "6 months ago",
        "review": "Mathias is a great PT. He fixed my chest press form and turns out my elbows were way too wide. I also asked him a ton of questions about nutrition and dieting, he definitely knows what he's talking about. Would recommend.",
        "taughtBy": "Mathias",
        "avatar": "https://static.vecteezy.com/system/resources/previews/019/879/186/non_2x/user-icon-on-transparent-background-free-png.png"
      },
      {
        "name": "Mikael Muria",
        "date": "2 weeks ago",
        "review": "Ethan always brings that energy. Be ready to put the work in and the results will follow. Very well thought out classes and always makes sure to check on your form throughout. 10/10 rating.",
        "taughtBy": "Ethan",
        "avatar": "https://static.vecteezy.com/system/resources/previews/019/879/186/non_2x/user-icon-on-transparent-background-free-png.png"
      },
      {
        "name": "Alyssa D",
        "date": "2 weeks ago",
        "review": "I worked with Julia on a 5 week progressive beginner class and she was very attentive and would adapt to the needs of the class, focusing on areas that people may be struggling with and needed to refine. She would give constructive and specific feedback that helped me progress exponentially! Highly recommend!",
        "taughtBy": "Julia",
        "avatar": "https://lh3.googleusercontent.com/a/ACg8ocKX7gO2hkAIFnn_pa1MO3YOjJvxKV5KajhVYwlmQZQl9smBw4_-ng=s96-c"
      },
      {
        "name": "Kiki Huang",
        "date": "2 months ago",
        "review": "Such a fun class! It was my first time doing a rowformers class and although it was challenging it was a nice change from my usual fitness routine. Maila is super encouraging and knowledgeable, can’t wait to be back soon!",
        "taughtBy": "Maila",
        "avatar": "https://randomuser.me/api/portraits/women/44.jpg"
      },
      {
        "name": "Andrew Liu",
        "date": "6 months ago",
        "review": "Wit was an amazing coach that taught me not only how to swing technically, but also how to swing confidently. His advice helped me gain consistency on the course and greatly reduced my score over the summer. I’d highly recommend his class to anyone looking to commit and improve their game drastically!",
        "taughtBy": "Wit",
        "avatar": "https://lh3.googleusercontent.com/a/AEdFTp4h8f_e7768l5La9fyK9oIVTWmjqbzGGtHxIEh5qQU=s96-c"
      },
      {
        "name": "Judice Montana",
        "date": "2 weeks ago",
        "review": "Investing in a series of 4 private sessions with Julia was hands down the best decision I've made for my dancing. Julia excels at identifying the specific technical challenges holding you back. Her approach is both incredibly insightful and deeply kind, fostering a truly safe space where learning and making mistakes feels natural. Through her guidance, I learned so much – not only refining my technique but also gaining profound self-awareness as a dancer. The knowledge and confidence I gained have directly elevated every single dance class I've attended afterward. Julia is exceptional, and I highly, highly recommend her. You will not be disappointed!",
        "taughtBy": "Julia",
        "avatar": "https://static.vecteezy.com/system/resources/previews/019/879/186/non_2x/user-icon-on-transparent-background-free-png.png"
      },
      {
        "name": "Lucia Wan",
        "date": "0 months ago",
        "review": "I’ve had the absolute pleasure of learning from DJ Vanessa and I can’t recommend her enough! As a female DJ, she brings such a unique energy to her teaching — confident, creative, and super inspiring. She’s incredibly knowledgeable about mixing, transitions, and reading the crowd, but what really sets her apart is how patient and encouraging she is with her students. She creates a fun, supportive space where you’re not afraid to make mistakes or ask questions. I went from feeling unsure behind the decks to actually being excited to play and experiment, all thanks to her guidance. Whether you’re just starting out or looking to level up your skills, she’ll help you get there — and make you fall in love with DJing along the way. So grateful to have learned from her!",
        "taughtBy": "DJ Vanessa",
        "avatar": "https://randomuser.me/api/portraits/women/15.jpg"
      },
      {
        "name": "Kevin Nisperos",
        "date": "3 weeks ago",
        "review": "Always a Vibe working out with Ethan and the City Sweats crew! Every exercise hit both controlled and explosive movements with great alternatives for those with possible injury. It’s never a workout when your vibin’ to great music and a supportive crew! LET’S GOOOOO!!! 🔥🔥🔥🔥",
        "taughtBy": "Ethan",
        "avatar": "https://lh3.googleusercontent.com/a/ACg8ocIeC4EGAZGySFo1aqKioSw0gowbkEp9tJAQyBWFJWk_G5jGhQ=s96-c"
      },
      {
        "name": "Janet H",
        "date": "3 weeks ago",
        "review": "Been to several of Coach Delano’s classes and he delivers every time! His workouts are thoughtfully curated, challenging yet still suitable for all levels (with mods as needed). Delano is an up and rising community lead and an elite athlete. His classes are always uplifting, dynamic and his positive energy is contagious!",
        "taughtBy": "Delano",
        "avatar": "https://static.vecteezy.com/system/resources/previews/019/879/186/non_2x/user-icon-on-transparent-background-free-png.png"
      },
      {
        "name": "Andrew Liu",
        "date": "6 months ago",
        "review": "Mathias was really great with teaching me how to properly warm up my joints before doing heavy movements & workouts. I especially appreciated his attention to detail and ability to see exactly how my form can improve. He was also great in helping my mentality for each set, focusing primarily on quality and loading each set correctly to reach my body goals. Would highly recommend!!",
        "taughtBy": "Mathias",
        "avatar": "https://lh3.googleusercontent.com/a/AEdFTp4h8f_e7768l5La9fyK9oIVTWmjqbzGGtHxIEh5qQU=s96-c"
      },
      {
        "name": "Sandhiya R",
        "date": "1 week ago",
        "review": "I have taken drop-in dance classes with Julia as well as her dance Fundamentals course. Her style of teaching was super clear and helpful, especially when training fundamental movements in Jazz funk/commercial styles. I really recommend her classes!",
        "taughtBy": "Julia",
        "avatar": "https://lh3.googleusercontent.com/a/ACg8ocKeIOrTz1Ulj7hhoy_IIUarlxhCvTnwco6NqRiuUp_OtTV2Oo08=s96-c"
      },
      {
        "name": "Andrea Lim",
        "date": "2 weeks ago",
        "review": "I attended a small group session led by Julia and learned a lot just within those few hours! She led us through several drills that worked on our foundational technique including grooves, turns and isolations. Attentive and observant, Julia quickly spotted my mistakes and corrected them. I feel really fortunate to have Julia as a teacher, as she is truly devoted to helping students improve, and always delivers feedback kindly and constructively.",
        "taughtBy": "Julia",
        "avatar": "https://lh3.googleusercontent.com/a/ACg8ocKLcsD0IdfdQOU526K_C0IeFLriHIyZUnDCb0xA_gkwu4Amj-c=s96-c"
      },
      {
        "name": "Andrew Liu",
        "date": "5 months ago",
        "review": "Great class!",
        "taughtBy": "Wit",
        "avatar": "https://lh3.googleusercontent.com/a/AEdFTp4h8f_e7768l5La9fyK9oIVTWmjqbzGGtHxIEh5qQU=s96-c"
      },
      {
        "name": "Sarah Padwal",
        "date": "2 weeks ago",
        "review": "Julia is a great instructor who can really help to refine fundamentals in dance!! I would highly recommend to anyone who is just starting out in jazz funk/open styles, or who wants to revisit basic movement and get personalized feedback.",
        "taughtBy": "Julia",
        "avatar": "https://static.vecteezy.com/system/resources/previews/019/879/186/non_2x/user-icon-on-transparent-background-free-png.png"
      },
      {
        "name": "Anna Maria Li",
        "date": "1 week ago",
        "review": "This is perfect for anyone who wants to work on fundamentals in jazz funk. It was so helpful getting specific feedback from Julia in a small class environment. I’ve learned more in one class than weeks of drop-in classes.",
        "taughtBy": "Julia",
        "avatar": "https://lh3.googleusercontent.com/a/ACg8ocKYB3XPQaXP6R5MGxogBXUVYESygfbwZ5s7ysEe7wO-QdXziOMs=s96-c"
      },
      {
        "name": "Claire Wang",
        "date": "2 months ago",
        "review": "It was my first time trying reformer Pilates, thanks to the best instructor Maila making it fun and challenging at the same time. I will definitely come back for the next session with Maila!",
        "taughtBy": "Maila",
        "avatar": "https://static.vecteezy.com/system/resources/previews/019/879/186/non_2x/user-icon-on-transparent-background-free-png.png"
      },
      {
        "name": "Reesha N",
        "date": "2 months ago",
        "review": "The absolute best instructor! You’re missing out if you haven’t already signed up for a class with Maila! Best atmosphere, the best workout and instructor- and the best crowd/community. So happy to be proud of the family Maila is building!",
        "taughtBy": "Maila",
        "avatar": "https://static.vecteezy.com/system/resources/previews/019/879/186/non_2x/user-icon-on-transparent-background-free-png.png"
      },
      {
        "name": "Ben Huang",
        "date": "5 months ago",
        "review": "Helpful tips that actually made a difference.",
        "taughtBy": "Wit",
        "avatar": "https://static.vecteezy.com/system/resources/previews/019/879/186/non_2x/user-icon-on-transparent-background-free-png.png"
      },
      {
        "name": "Aatrayee B",
        "date": "2 weeks ago",
        "review": "I did Julia’s five-week fundamentals training and honestly, it was totally worth it. Her classes are great for all dance levels, and she creates such a supportive and welcoming vibe. I really noticed an improvement in my dance fundamentals thanks to her clear teaching and encouraging approach.",
        "taughtBy": "Julia",
        "avatar": "https://static.vecteezy.com/system/resources/previews/019/879/186/non_2x/user-icon-on-transparent-background-free-png.png"
      },
      {
        "name": "Lisa H",
        "date": "2 months ago",
        "review": "Maila is the best! This was my first time at STRONG Pilates (Beaches), and I absolutely loved it. I've always been a fan of Reformer, but this class took it to another level. Maila's energy made the whole experience. I’m already looking forward to my next session with Maila!",
        "taughtBy": "Maila",
        "avatar": "https://static.vecteezy.com/system/resources/previews/019/879/186/non_2x/user-icon-on-transparent-background-free-png.png"
      },
      {
        "name": "Ben Huang",
        "date": "5 months ago",
        "review": "Had a really bad slice on my driver and Wit fixed it in one session.",
        "taughtBy": "Wit",
        "avatar": "https://static.vecteezy.com/system/resources/previews/019/879/186/non_2x/user-icon-on-transparent-background-free-png.png"
      },
      {
        "name": "Matthew Manuel",
        "date": "6 months ago",
        "review": "Had a great experience with Sean and the others. Had no prior experience with CDJ’s before this but I learned a lot from this class alone. Everyone was friendly, fun and welcoming and I would definitely come back for another class or event.",
        "taughtBy": "Sean",
        "avatar": "https://lh3.googleusercontent.com/a/ACg8ocLeH9xcif4Ss8XRgR07UOB8PslqhnZ4cHOlBL2b9UIPzYu3Vbc=s96-c"
      },
      {
        "name": "Ethan Delano",
        "date": "2 months ago",
        "review": "Amazing class and experience with Maila! A great class, definitely tough & she made us work for it and great energy all throughout!",
        "taughtBy": "Maila",
        "avatar": "https://static.vecteezy.com/system/resources/previews/019/879/186/non_2x/user-icon-on-transparent-background-free-png.png"
      },
      {
        "name": "Lisette Abines",
        "date": "1 week ago",
        "review": "Julia was my first-ever dance teacher at DLX, and I feel incredibly lucky that I got to start my journey with her. I trained under her for about a year, and even though I've been dancing for two years, the growth I experienced during my time in her programs and drop-in classes was huge. Julia creates such an encouraging environment where it feels safe to make mistakes and look silly. Whether it was through drills, foundations or choreography, I always felt class feeling inspired and pushed in the best way possible. Overall, I'm super grateful for everything she's taught me so far and for helping me build my foundation as a dancer. Julia is phenomenal! Take the opportunity to learn from her when you can!!!",
        "taughtBy": "Julia",
        "avatar": "https://static.vecteezy.com/system/resources/previews/019/879/186/non_2x/user-icon-on-transparent-background-free-png.png"
      },
      {
        "name": "Amanda Edison",
        "date": "3 weeks ago",
        "review": "I recently attended coach Ethan’s Lif’ up class. He truly put on an epic event, Im so glad I went. From the killer workout, to the amazing dj’s playing soca music just in time for Caribana coming up, to the vendors, the free goodies, the photographers shooting content, the challenges & prizes….WELL DONE, Ethan! 👏🏼 👏🏼 I truly cant wait for the next one!!",
        "taughtBy": "Ethan",
        "avatar": "https://static.vecteezy.com/system/resources/previews/019/879/186/non_2x/user-icon-on-transparent-background-free-png.png"
      },
      {
        "name": "Jeffrey Song",
        "date": "6 months ago",
        "review": "Coach Wit is goated, I was slicing like crazy, and he spotted the problem right away. After a few tweaks, my shots were straighter than ever. Super easy to work with and explains things in a way that I was able to understand right away. Highly recommend.",
        "taughtBy": "Wit",
        "avatar": "https://randomuser.me/api/portraits/men/13.jpg"
      }
    ],
    []
  );

  // state for rows
  const [loading, setLoading] = useState(true);
  const [topRow, setTopRow] = useState([]);
  const [bottomRow, setBottomRow] = useState([]);

  // Prepare and split rows once on mount
  useEffect(() => {
    // Shuffle for variety but deterministic per session (use Fisher-Yates)
    const arr = [...parentsTestimonials];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }

    const midpoint = Math.ceil(arr.length / 2);
    const top = arr.slice(0, midpoint);
    const bottom = arr.slice(midpoint);

    // Tile arrays to ensure marquee has enough items to fill wide viewports (avoids gaps)
    const MIN_ITEMS = 8; // tweak if your slides are wider
    setTopRow(tileArray(top, MIN_ITEMS));
    setBottomRow(tileArray(bottom, MIN_ITEMS));
    setLoading(false);
  }, [parentsTestimonials]);

  const marqueeSpeed = 40; // 0 will render static for assistive users

  return (
    <section className="relative w-screen py-14 md:py-20 bg-orange-25 overflow-x-hidden">
      {/* background layers (if heavy, consider simplifying) */}
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
        <h2 className="text-2xl md:text-4xl font-extrabold tracking-tight text-[#261f22] drop-shadow-sm">
          Find the right instructor for you
        </h2>
        <p className="mt-4 text-base md:text-lg font-medium text-slate-700">
          With over 30 instructors and 100+ learners
        </p>
      </div>

      <div className="w-full flex flex-col relative z-10" role="list" aria-label="Testimonials list">
        {loading ? (
          <div className="text-center text-xs tracking-wide text-gray-600 py-8">Loading testimonials...</div>
        ) : (
          <>
            <Marquee speed={marqueeSpeed} gradient={false} className="mb-10" pauseOnHover={false}>
              {topRow.map((item, i) => (
                <Card key={`${(item.name || "anon").replace(/\s+/g, "_")}-${i}`} item={item} />
              ))}
            </Marquee>

            <Marquee speed={marqueeSpeed} direction="right" gradient={false} pauseOnHover={false}>
              {bottomRow.map((item, i) => (
                <Card key={`${(item.name || "anon").replace(/\s+/g, "_")}-bot-${i}`} item={item} />
              ))}
            </Marquee>
          </>
        )}
      </div>
    </section>
  );
}
