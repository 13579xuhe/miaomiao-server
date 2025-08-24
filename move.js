// 存储每个部分的按钮状态
const sectionStates = {};

// 获取当前设备应显示的最大项目数（优化移动端小尺寸）
function getMaxVisible() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    // 超小屏幕设备（如359×519）
    if (width <= 360 || height <= 520) return 2;
    // 小屏幕移动设备
    if (width <= 600) return 3;
    // 中等屏幕
    if (width <= 900) return 4;
    // 大屏幕
    return 5;
}

// 初始化折叠功能
function setupCollapsibleSection(containerId) {
    const container = document.getElementById(containerId);
    const items = container.querySelectorAll('.hobby-item');
    const maxVisible = getMaxVisible();

    // 检查是否已经有按钮
    let toggleBtn = container.querySelector('.toggle-btn');

    // 如果项目数量不超过最大显示数量，则移除按钮（如果有）
    if (items.length <= maxVisible) {
        if (toggleBtn) {
            toggleBtn.remove();
            delete sectionStates[containerId];
        }
        // 确保所有项目都显示
        items.forEach(item => item.style.display = 'flex');
        return;
    }

    // 如果没有按钮，创建一个新的
    if (!toggleBtn) {
        toggleBtn = document.createElement('button');
        toggleBtn.className = 'toggle-btn';
        container.appendChild(toggleBtn);
    }

    // 获取当前状态（默认为折叠）
    const isExpanded = sectionStates[containerId]?.expanded || false;
    toggleBtn.textContent = isExpanded ? '收起' : '显示更多';

    // 设置初始显示状态
    for (let i = 0; i < items.length; i++) {
        items[i].style.display = (i < maxVisible || isExpanded) ? 'flex' : 'none';
    }

    // 切换显示/隐藏
    function toggleItems() {
        const nowExpanded = toggleBtn.textContent === '收起';
        const currentMaxVisible = getMaxVisible();

        for (let i = 0; i < items.length; i++) {
            items[i].style.display = nowExpanded ?
                (i < currentMaxVisible ? 'flex' : 'none') : 'flex';
        }

        toggleBtn.textContent = nowExpanded ? '显示更多' : '收起';

        // 保存状态
        sectionStates[containerId] = {
            expanded: !nowExpanded
        };
    }

    // 添加点击事件（电脑端）
    toggleBtn.addEventListener('click', function(e) {
        e.preventDefault();
        toggleItems();
    });

    // 添加触摸事件支持（移动端）
    toggleBtn.addEventListener('touchstart', function(e) {
        e.preventDefault();
        this.classList.add('active');
    }, {passive: false});

    toggleBtn.addEventListener('touchend', function(e) {
        e.preventDefault();
        this.classList.remove('active');
        toggleItems();
    }, {passive: false});
}

// 页面加载完成后初始化两个部分
document.addEventListener('DOMContentLoaded', function() {
    setupCollapsibleSection('hobby');
    setupCollapsibleSection('achievement');

    // 防抖函数，避免频繁重绘
    function debounce(func, wait) {
        let timeout;
        return function() {
            clearTimeout(timeout);
            timeout = setTimeout(func, wait);
        };
    }

    // 窗口大小改变时重新计算显示状态
    window.addEventListener('resize', debounce(function() {
        setupCollapsibleSection('hobby');
        setupCollapsibleSection('achievement');
    }, 100));
});

const carouselData = [
    {
        image: "./images/1.jpg",
    },
    {
        image: "./images/2.jpg",
    },
    {
        image: "./images/3.jpg",
    },
    {
        image: "./images/4.jpg",
    }
];

// 轮播图类
class Carousel {
    constructor(container, data) {
        this.container = container;
        this.data = data;
        this.slides = container.querySelector('.carousel-slides');
        this.prevBtn = container.querySelector('.carousel-btn-prev');
        this.nextBtn = container.querySelector('.carousel-btn-next');
        this.indicatorsContainer = container.querySelector('.carousel-indicators');
        this.currentIndex = 0;
        this.intervalId = null;
        this.autoPlayDelay = 3000; // 3秒自动播放

        this.init();
    }

    // 初始化轮播图
    init() {
        this.createSlides();
        this.createIndicators();
        this.setActiveSlide();
        this.addEventListeners();
        this.startAutoPlay();
    }

    // 创建幻灯片
    createSlides() {
        this.slides.innerHTML = '';

        this.data.forEach(item => {
            const slide = document.createElement('div');
            slide.className = 'carousel-slide';
            slide.innerHTML = `
                        <img src="${item.image}" alt="${item.title}">
                    `;
            this.slides.appendChild(slide);
        });
    }

    // 创建指示器
    createIndicators() {
        this.indicatorsContainer.innerHTML = '';

        this.data.forEach((_, index) => {
            const indicator = document.createElement('div');
            indicator.className = 'carousel-indicator';
            indicator.dataset.index = index;
            this.indicatorsContainer.appendChild(indicator);
        });
    }

    // 设置当前活动幻灯片
    setActiveSlide() {
        // 移除所有活动状态
        const slides = this.slides.querySelectorAll('.carousel-slide');
        const indicators = this.indicatorsContainer.querySelectorAll('.carousel-indicator');

        slides.forEach(slide => slide.classList.remove('active'));
        indicators.forEach(indicator => indicator.classList.remove('active'));

        // 设置当前活动状态
        slides[this.currentIndex].classList.add('active');
        indicators[this.currentIndex].classList.add('active');

        // 移动幻灯片位置
        this.slides.style.transform = `translateX(-${this.currentIndex * 100}%)`;
    }

    // 添加事件监听
    addEventListeners() {
        // 上一张按钮
        this.prevBtn.addEventListener('click', () => {
            this.prevSlide();
            this.restartAutoPlay();
        });

        // 下一张按钮
        this.nextBtn.addEventListener('click', () => {
            this.nextSlide();
            this.restartAutoPlay();
        });

        // 指示器点击
        this.indicatorsContainer.querySelectorAll('.carousel-indicator').forEach(indicator => {
            indicator.addEventListener('click', () => {
                this.goToSlide(parseInt(indicator.dataset.index));
                this.restartAutoPlay();
            });
        });

        // 鼠标悬停时暂停自动播放
        this.container.addEventListener('mouseenter', () => {
            this.stopAutoPlay();
        });

        // 鼠标离开时恢复自动播放
        this.container.addEventListener('mouseleave', () => {
            this.startAutoPlay();
        });
    }

    // 切换到上一张幻灯片
    prevSlide() {
        this.currentIndex = this.currentIndex === 0 ? this.data.length - 1 : this.currentIndex - 1;
        this.setActiveSlide();
    }

    // 切换到下一张幻灯片
    nextSlide() {
        this.currentIndex = this.currentIndex === this.data.length - 1 ? 0 : this.currentIndex + 1;
        this.setActiveSlide();
    }

    // 跳转到指定幻灯片
    goToSlide(index) {
        this.currentIndex = index;
        this.setActiveSlide();
    }

    // 开始自动播放
    startAutoPlay() {
        this.stopAutoPlay();
        this.intervalId = setInterval(() => {
            this.nextSlide();
        }, this.autoPlayDelay);
    }

    // 停止自动播放
    stopAutoPlay() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }

    // 重新开始自动播放
    restartAutoPlay() {
        this.stopAutoPlay();
        this.startAutoPlay();
    }
}

// 初始化轮播图
document.addEventListener('DOMContentLoaded', () => {
    const carouselContainer = document.querySelector('.carousel-container');
    new Carousel(carouselContainer, carouselData);
});