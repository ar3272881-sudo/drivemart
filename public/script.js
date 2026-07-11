/*=========================================
        DRIVE MART PREMIUM JS
=========================================*/

// ============================
// LOADER
// ============================

window.addEventListener("load", function () {

    const loader = document.querySelector(".loader");

    if (loader) {

        loader.style.opacity = "0";
        loader.style.visibility = "hidden";

        setTimeout(() => {

            loader.remove();

        }, 600);

    }

});

// ============================
// SCROLL TO TOP
// ============================

const scrollTopBtn = document.querySelector(".scroll-top");

window.addEventListener("scroll", () => {

    if (!scrollTopBtn) return;

    if (window.scrollY > 400) {

        scrollTopBtn.classList.add("active");

    } else {

        scrollTopBtn.classList.remove("active");

    }

});

if (scrollTopBtn) {

    scrollTopBtn.addEventListener("click", function (e) {

        e.preventDefault();

        window.scrollTo({

            top: 0,

            behavior: "smooth"

        });

    });

}

// ============================
// PROGRESS BAR
// ============================

const progressBar = document.querySelector(".progress-bar");

window.addEventListener("scroll", () => {

    if (!progressBar) return;

    let scroll = document.documentElement.scrollTop;

    let height = document.documentElement.scrollHeight - document.documentElement.clientHeight;

    let percent = (scroll / height) * 100;

    progressBar.style.width = percent + "%";

});

// ============================
// CURSOR GLOW
// ============================

const cursor = document.querySelector(".cursor-glow");

document.addEventListener("mousemove", (e) => {

    if (!cursor) return;

    cursor.style.left = e.clientX + "px";
    cursor.style.top = e.clientY + "px";

});

// ============================
// REVEAL ANIMATION
// ============================

const revealItems = document.querySelectorAll(

".car-card,.brand-card,.why-card,.stat-card,.testimonial-card,.newsletter-box,.footer"

);

function revealOnScroll(){

    revealItems.forEach(item=>{

        const top = item.getBoundingClientRect().top;

        if(top < window.innerHeight-100){

            item.style.opacity="1";

            item.style.transform="translateY(0)";

        }

    });

}

revealItems.forEach(item=>{

    item.style.opacity="0";

    item.style.transform="translateY(80px)";

    item.style.transition="1s";

});

window.addEventListener("scroll",revealOnScroll);

revealOnScroll();
/*=========================================
        PART 9B
=========================================*/

// ============================
// NAVBAR SCROLL EFFECT
// ============================

const header = document.querySelector("header");

window.addEventListener("scroll", () => {

    if (!header) return;

    if (window.scrollY > 80) {

        header.style.background = "rgba(5,7,13,.95)";
        header.style.backdropFilter = "blur(20px)";
        header.style.boxShadow = "0 10px 30px rgba(0,0,0,.35)";

    } else {

        header.style.background = "transparent";
        header.style.boxShadow = "none";

    }

});

// ============================
// ANIMATED COUNTERS
// ============================

const counters = document.querySelectorAll(".stat-card h2");

let counterStarted = false;

function startCounters() {

    if (counterStarted) return;

    const stats = document.querySelector(".stats");

    if (!stats) return;

    const top = stats.getBoundingClientRect().top;

    if (top < window.innerHeight - 100) {

        counterStarted = true;

        counters.forEach(counter => {

            let text = counter.innerText;

            let target = parseFloat(text);

            if (isNaN(target)) return;

            let current = 0;

            let speed = target / 80;

            const update = () => {

                current += speed;

                if (current >= target) {

                    counter.innerText = text;

                } else {

                    if (text.includes("+")) {

                        counter.innerText = Math.floor(current) + "+";

                    } else {

                        counter.innerText = current.toFixed(1);

                    }

                    requestAnimationFrame(update);

                }

            };

            update();

        });

    }

}

window.addEventListener("scroll", startCounters);

startCounters();

// ============================
// BUTTON RIPPLE EFFECT
// ============================

document.querySelectorAll("button").forEach(button => {

    button.addEventListener("click", function(e){

        const circle = document.createElement("span");

        const d = Math.max(this.clientWidth,this.clientHeight);

        circle.style.width = d + "px";
        circle.style.height = d + "px";

        circle.style.position = "absolute";
        circle.style.borderRadius = "50%";
        circle.style.background = "rgba(255,255,255,.35)";
        circle.style.left = (e.offsetX-d/2)+"px";
        circle.style.top = (e.offsetY-d/2)+"px";
        circle.style.pointerEvents="none";
        circle.style.animation="ripple .6s linear";

        this.appendChild(circle);

        setTimeout(()=>{

            circle.remove();

        },600);

    });

});

// ============================
// IMAGE PARALLAX
// ============================

const heroImage = document.querySelector(".hero-image img");

window.addEventListener("mousemove",(e)=>{

    if(!heroImage) return;

    let x = (window.innerWidth/2-e.clientX)/40;

    let y = (window.innerHeight/2-e.clientY)/40;

    heroImage.style.transform =
    `translate(${x}px,${y}px)`;

});

// ============================
// ACTIVE NAV LINK
// ============================

document.querySelectorAll("nav a").forEach(link=>{

    link.addEventListener("click",function(){

        document.querySelectorAll("nav a")
        .forEach(l=>l.classList.remove("active"));

        this.classList.add("active");

    });

});/*=========================================
        PART 10 - FINAL PREMIUM JS
=========================================*/

// ============================
// TYPING EFFECT
// ============================

const typingText = document.querySelector(".typing");

if (typingText) {

    const words = [

        "Luxury Cars",

        "Sports Cars",

        "Premium SUVs",

        "Drive Your Dream"

    ];

    let wordIndex = 0;
    let charIndex = 0;
    let deleting = false;

    function typeEffect(){

        const current = words[wordIndex];

        if(!deleting){

            typingText.textContent = current.substring(0,charIndex++);

            if(charIndex>current.length){

                deleting=true;

                setTimeout(typeEffect,1500);

                return;

            }

        }else{

            typingText.textContent=current.substring(0,charIndex--);

            if(charIndex<0){

                deleting=false;

                wordIndex++;

                if(wordIndex>=words.length){

                    wordIndex=0;

                }

            }

        }

        setTimeout(typeEffect,deleting?50:120);

    }

    typeEffect();

}

// ============================
// FLOATING PARTICLES
// ============================

const particleContainer = document.querySelector(".particles");

if(particleContainer){

    for(let i=0;i<35;i++){

        const span=document.createElement("span");

        span.style.left=Math.random()*100+"%";

        span.style.animationDelay=Math.random()*12+"s";

        span.style.animationDuration=(12+Math.random()*10)+"s";

        span.style.opacity=Math.random();

        particleContainer.appendChild(span);

    }

}

// ============================
// IMAGE TILT EFFECT
// ============================

document.querySelectorAll(".car-card").forEach(card=>{

card.addEventListener("mousemove",(e)=>{

const rect=card.getBoundingClientRect();

const x=e.clientX-rect.left;

const y=e.clientY-rect.top;

const rotateX=((y/rect.height)-0.5)*-10;

const rotateY=((x/rect.width)-0.5)*10;

card.style.transform=

`perspective(1000px)
rotateX(${rotateX}deg)
rotateY(${rotateY}deg)
translateY(-10px)`;

});

card.addEventListener("mouseleave",()=>{

card.style.transform="perspective(1000px) rotateX(0) rotateY(0)";

});

});

// ============================
// SMOOTH PAGE SCROLL
// ============================

document.querySelectorAll('a[href^="#"]').forEach(anchor=>{

anchor.addEventListener("click",function(e){

const target=document.querySelector(this.getAttribute("href"));

if(target){

e.preventDefault();

target.scrollIntoView({

behavior:"smooth"

});

}

});

});

// ============================
// RANDOM GLOW EFFECT
// ============================

setInterval(()=>{

document.querySelectorAll(".brand-card").forEach(card=>{

card.style.boxShadow="0 0 25px rgba(255,0,0,.15)";

setTimeout(()=>{

card.style.boxShadow="";

},700);

});

},4000);

// ============================
// PAGE READY
// ============================

console.log("🚗 Drive Mart Premium Loaded Successfully");

// Auto-hide flash messages without affecting form errors.
setTimeout(() => {
    document.querySelectorAll('.flash-message').forEach((message) => {
        message.style.opacity = '0';
        message.style.transform = 'translateY(-8px)';
        setTimeout(() => message.remove(), 350);
    });
}, 5000);
