// ===== 全局变量和配置 =====
const CAROUSEL_CONFIG = {
    autoPlayDelay: 5000,
    swipeThreshold: 50,
    resizeDebounceTime: 100
};

const BREAKPOINTS = {
    xs: {width: 360, height: 520, items: 2},
    sm: {width: 600, items: 3},
    md: {width: 900, items: 4},
    lg: {items: 5}
};

// 存储每个部分的按钮状态
const sectionStates = {};

// ===== 工具函数 =====
// 防抖函数
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// 获取当前设备应显示的最大项目数
function getMaxVisible() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    if (width <= BREAKPOINTS.xs.width || height <= BREAKPOINTS.xs.height)
        return BREAKPOINTS.xs.items;
    if (width <= BREAKPOINTS.sm.width)
        return BREAKPOINTS.sm.items;
    if (width <= BREAKPOINTS.md.width)
        return BREAKPOINTS.md.items;

    return BREAKPOINTS.lg.items;
}

// ===== 折叠功能模块 =====
function setupCollapsibleSection(containerId) {
    const container = document.getElementById(containerId);
    if (!container) {
        console.warn(`容器元素 #${containerId} 不存在`);
        return;
    }

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
        toggleBtn.setAttribute('aria-expanded', 'false');
        toggleBtn.setAttribute('aria-label', '切换显示更多内容');
        container.appendChild(toggleBtn);
    }

    // 获取当前状态（默认为折叠）
    const isExpanded = sectionStates[containerId]?.expanded || false;
    toggleBtn.textContent = isExpanded ? '收起' : `显示更多 (${items.length - maxVisible}+)`;
    toggleBtn.setAttribute('aria-expanded', isExpanded.toString());

    // 设置初始显示状态
    updateItemsVisibility(items, maxVisible, isExpanded);

    // 切换显示/隐藏
    function toggleItems() {
        const nowExpanded = toggleBtn.getAttribute('aria-expanded') === 'true';
        const currentMaxVisible = getMaxVisible();

        for (let i = 0; i < items.length; i++) {
            items[i].style.display = nowExpanded ?
                (i < currentMaxVisible ? 'flex' : 'none') : 'flex';
        }

        const newExpandedState = !nowExpanded;
        toggleBtn.textContent = newExpandedState ? '收起' : `显示更多 (${items.length - currentMaxVisible}+)`;
        toggleBtn.setAttribute('aria-expanded', newExpandedState.toString());

        // 保存状态
        sectionStates[containerId] = {
            expanded: newExpandedState
        };
    }

    // 添加事件监听器
    function setupEventListeners() {
        // 添加点击事件（电脑端）
        toggleBtn.addEventListener('click', function (e) {
            e.preventDefault();
            toggleItems();
        });

        // 添加触摸事件支持（移动端）
        toggleBtn.addEventListener('touchstart', function (e) {
            e.preventDefault();
            this.classList.add('active');
        }, {passive: false});

        toggleBtn.addEventListener('touchend', function (e) {
            e.preventDefault();
            this.classList.remove('active');
            toggleItems();
        }, {passive: false});

        // 添加键盘支持
        toggleBtn.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleItems();
            }
        });
    }

    setupEventListeners();
}

// 更新项目可见性
function updateItemsVisibility(items, maxVisible, isExpanded) {
    for (let i = 0; i < items.length; i++) {
        items[i].style.display = (i < maxVisible || isExpanded) ? 'flex' : 'none';

        // 添加ARIA属性
        if (i >= maxVisible) {
            items[i].setAttribute('aria-hidden', isExpanded ? 'false' : 'true');
        }
    }
}

// ===== 轮播图模块 =====
class Carousel {
    constructor() {
        this.slidesContainer = document.querySelector('.carousel-slides');
        this.slides = document.querySelectorAll('.carousel-slide');
        this.prevBtn = document.querySelector('.prev-btn');
        this.nextBtn = document.querySelector('.next-btn');
        this.indicators = document.querySelectorAll('.indicator');
        this.progressBar = document.querySelector('.progress-bar');

        if (!this.slidesContainer || this.slides.length === 0) {
            console.warn('轮播图元素未找到');
            return;
        }

        this.currentIndex = 0;
        this.intervalId = null;
        this.startX = 0;
        this.endX = 0;
        this.isDragging = false;
        this.slideCount = this.slides.length;
        this.autoPlayDelay = CAROUSEL_CONFIG.autoPlayDelay;

        this.init();
    }

    init() {
        this.updateSlidePosition();
        this.startAutoPlay();
        this.addEventListeners();
        this.addTouchEvents();
    }

    updateSlidePosition() {
        this.slidesContainer.style.transform = `translateX(-${this.currentIndex * 100}%)`;

        // 更新指示器
        this.indicators.forEach((indicator, index) => {
            if (index === this.currentIndex) {
                indicator.classList.add('active');
                indicator.setAttribute('aria-current', 'true');
            } else {
                indicator.classList.remove('active');
                indicator.setAttribute('aria-current', 'false');
            }
        });

        // 更新幻灯片ARIA属性
        this.slides.forEach((slide, index) => {
            slide.setAttribute('aria-hidden', index !== this.currentIndex ? 'true' : 'false');
        });

        this.resetProgressBar();
    }

    nextSlide() {
        this.currentIndex = (this.currentIndex + 1) % this.slideCount;
        this.updateSlidePosition();
    }

    prevSlide() {
        this.currentIndex = (this.currentIndex - 1 + this.slideCount) % this.slideCount;
        this.updateSlidePosition();
    }

    goToSlide(index) {
        if (index >= 0 && index < this.slideCount) {
            this.currentIndex = index;
            this.updateSlidePosition();
        }
    }

    startAutoPlay() {
        this.stopAutoPlay();

        this.progressBar.style.width = '100%';
        this.progressBar.style.transition = `width ${this.autoPlayDelay}ms linear`;

        this.intervalId = setInterval(() => this.nextSlide(), this.autoPlayDelay);
    }

    stopAutoPlay() {
        clearInterval(this.intervalId);
        this.progressBar.style.transition = 'none';
        this.progressBar.style.width = '0%';
    }

    resetProgressBar() {
        this.progressBar.style.transition = 'none';
        this.progressBar.style.width = '0%';

        // 强制重绘
        void this.progressBar.offsetWidth;

        this.progressBar.style.transition = `width ${this.autoPlayDelay}ms linear`;
        this.progressBar.style.width = '100%';
    }

    addTouchEvents() {
        this.slidesContainer.addEventListener('touchstart', this.handleTouchStart.bind(this), {passive: true});
        this.slidesContainer.addEventListener('touchmove', this.handleTouchMove.bind(this), {passive: true});
        this.slidesContainer.addEventListener('touchend', this.handleTouchEnd.bind(this));

        // 添加鼠标拖动支持（桌面端）
        this.slidesContainer.addEventListener('mousedown', this.handleMouseDown.bind(this));
        this.slidesContainer.addEventListener('mousemove', this.handleMouseMove.bind(this));
        this.slidesContainer.addEventListener('mouseup', this.handleMouseUp.bind(this));
        this.slidesContainer.addEventListener('mouseleave', this.handleMouseUp.bind(this));
    }

    handleTouchStart(event) {
        this.startX = event.touches[0].clientX;
        this.stopAutoPlay();
    }

    handleTouchMove(event) {
        if (!this.isDragging) {
            this.isDragging = true;
        }
        this.endX = event.touches[0].clientX;
    }

    handleTouchEnd() {
        if (!this.isDragging) return;

        if (this.startX - this.endX > CAROUSEL_CONFIG.swipeThreshold) {
            this.nextSlide();
        } else if (this.endX - this.startX > CAROUSEL_CONFIG.swipeThreshold) {
            this.prevSlide();
        }

        this.isDragging = false;
        this.startAutoPlay();
    }

    handleMouseDown(event) {
        this.startX = event.clientX;
        this.isDragging = true;
        this.stopAutoPlay();
        event.preventDefault();
    }

    handleMouseMove(event) {
        if (!this.isDragging) return;
        this.endX = event.clientX;
    }

    handleMouseUp() {
        if (!this.isDragging) return;

        if (this.startX - this.endX > CAROUSEL_CONFIG.swipeThreshold) {
            this.nextSlide();
        } else if (this.endX - this.startX > CAROUSEL_CONFIG.swipeThreshold) {
            this.prevSlide();
        }

        this.isDragging = false;
        this.startAutoPlay();
    }

    addEventListeners() {
        // 按钮点击事件
        if (this.nextBtn) {
            this.nextBtn.addEventListener('click', () => {
                this.stopAutoPlay();
                this.nextSlide();
                this.startAutoPlay();
            });
        }

        if (this.prevBtn) {
            this.prevBtn.addEventListener('click', () => {
                this.stopAutoPlay();
                this.prevSlide();
                this.startAutoPlay();
            });
        }

        // 指示器点击事件
        this.indicators.forEach((indicator, index) => {
            indicator.addEventListener('click', () => {
                this.stopAutoPlay();
                this.goToSlide(index);
                this.startAutoPlay();
            });
        });

        // 鼠标悬停时暂停自动播放（仅桌面端）
        if (window.matchMedia("(min-width: 769px)").matches) {
            this.slidesContainer.addEventListener('mouseenter', () => this.stopAutoPlay());
            this.slidesContainer.addEventListener('mouseleave', () => this.startAutoPlay());
        }

        // 触摸事件暂停自动播放
        this.slidesContainer.addEventListener('touchstart', () => this.stopAutoPlay(), {passive: true});
        this.slidesContainer.addEventListener('touchend', () => this.startAutoPlay(), {passive: true});

        // 键盘导航支持
        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft') {
                this.stopAutoPlay();
                this.prevSlide();
                this.startAutoPlay();
            } else if (e.key === 'ArrowRight') {
                this.stopAutoPlay();
                this.nextSlide();
                this.startAutoPlay();
            }
        });
    }
}

// ===== 页面初始化 =====
function initPage() {
    // 初始化折叠部分
    setupCollapsibleSection('hobby');
    setupCollapsibleSection('achievement');

    // 初始化轮播图
    new Carousel();

    // 窗口大小改变时重新计算显示状态
    window.addEventListener('resize', debounce(function () {
        setupCollapsibleSection('hobby');
        setupCollapsibleSection('achievement');
    }, CAROUSEL_CONFIG.resizeDebounceTime));
}

// ===== 页面加载完成后初始化 =====
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPage);
} else {
    initPage();
}

document.addEventListener('DOMContentLoaded', function() {
    const musicPlayer = document.getElementById('bg-music');
    const record = document.getElementById('record');
    const playPauseBtn = document.getElementById('play-pause');
    const playIcon = document.querySelector('.play-icon');
    const volumeSlider = document.getElementById('volume-slider');

    // 初始化设置
    musicPlayer.volume = localStorage.getItem('musicVolume') || 0.3;
    volumeSlider.value = musicPlayer.volume;

    // 播放/暂停功能
    playPauseBtn.addEventListener('click', function() {
        if (musicPlayer.paused) {
            musicPlayer.play();
            record.style.animationPlayState = 'running';
            playIcon.textContent = '❚❚';
        } else {
            musicPlayer.pause();
            record.style.animationPlayState = 'paused';
            playIcon.textContent = '▶';
        }
    });

    // 音量控制
    volumeSlider.addEventListener('input', function() {
        musicPlayer.volume = this.value;
        localStorage.setItem('musicVolume', this.value);
    });

    // 尝试自动播放（可能被浏览器阻止）
    const playPromise = musicPlayer.play();
    if (playPromise !== undefined) {
        playPromise.then(_ => {
            record.style.animationPlayState = 'running';
            playIcon.textContent = '❚❚';
        }).catch(error => {
            console.log('自动播放被阻止:', error);
        });
    }

    // 鼠标悬停时显示控制面板
    record.addEventListener('mouseenter', function() {
        document.querySelector('.record-controls').style.opacity = '1';
    });

    // 鼠标离开时隐藏控制面板（延迟）
    let hideTimeout;
    record.addEventListener('mouseleave', function() {
        hideTimeout = setTimeout(() => {
            document.querySelector('.record-controls').style.opacity = '0';
        }, 1000);
    });

    // 防止鼠标移动到控制面板时隐藏
    document.querySelector('.record-controls').addEventListener('mouseenter', function() {
        clearTimeout(hideTimeout);
        this.style.opacity = '1';
    });

    document.querySelector('.record-controls').addEventListener('mouseleave', function() {
        this.style.opacity = '0';
    });
});