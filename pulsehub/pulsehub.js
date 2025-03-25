// Mock data for user cards
const users = [
    { name: "Alex", age: 28, info: "Loves hiking and coffee." },
    { name: "Sophie", age: 24, info: "Passionate about photography." },
    { name: "Liam", age: 31, info: "Enjoys cooking and jazz music." },
    { name: "Emma", age: 27, info: "Avid reader and traveler." },
    { name: "Noah", age: 29, info: "Tech enthusiast and gamer." },
    { name: "Olivia", age: 26, info: "Yoga instructor and nature lover." }
];

const cardContainer = document.getElementById('cardContainer');

// Function to render cards
function renderCards() {
    cardContainer.innerHTML = '';
    users.forEach((user) => {
        const card = document.createElement('div');
        card.classList.add('user-card');
        card.innerHTML = `
            <div class="parallax-bg"></div>
            <div class="user-header">
                <span class="user-name">${user.name}</span>
                <span class="user-age">${user.age}</span>
            </div>
            <p class="user-info">${user.info}</p>
        `;
        cardContainer.appendChild(card);
    });
}

// Intersection Observer for smooth card appearance
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target); // Stop observing once visible
        }
    });
}, { threshold: 0.2 });

// Parallax effect on scroll
function handleParallax() {
    const cards = document.querySelectorAll('.user-card');
    cards.forEach(card => {
        const rect = card.getBoundingClientRect();
        const scrollPosition = window.innerHeight - rect.top;
        const parallaxBg = card.querySelector('.parallax-bg');
        if (rect.top < window.innerHeight && rect.bottom > 0) {
            const parallaxOffset = scrollPosition * 0.2; // Adjust for parallax speed
            parallaxBg.style.transform = `translateY(${parallaxOffset}px)`;
        }
    });
}

// Initial render
renderCards();

// Observe cards as they come into view
const cards = document.querySelectorAll('.user-card');
cards.forEach(card => observer.observe(card));

// Add scroll event listener for parallax effect
window.addEventListener('scroll', handleParallax);
cardContainer.addEventListener('scroll', handleParallax);