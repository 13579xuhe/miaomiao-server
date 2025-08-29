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

// DOM加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    const carousel = new Carousel();

    // 响应式处理（可选）
    window.addEventListener('resize', () => {
        carousel.updateSlidePosition();
    });
});

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



document.addEventListener('DOMContentLoaded', function() {
    const mainBtn = document.getElementById('mainBtn');
    const modalOverlay = document.getElementById('modalOverlay');
    const closeBtn = document.getElementById('closeBtn');
    const subBtns = document.querySelectorAll('.sub-btn');

    // 获取当前页面路径
// 根据当前页面更新按钮显示状态
    function updateButtonVisibility() {
        const currentPage = window.location.pathname.split('/').pop() || 'index.html';

        subBtns.forEach(btn => {
            const btnHref = btn.getAttribute('href');
            if (btnHref) {
                const btnPage = btnHref.split('/').pop();
                // 如果按钮链接的页面与当前页面相同，则隐藏该按钮
                if (btnPage === currentPage) {
                    btn.style.display = 'none';
                } else {
                    btn.style.display = 'flex';
                }
            }
        });
    }

    // 初始化按钮可见性
    updateButtonVisibility();

    // 监听hash变化（模拟页面切换）
    window.addEventListener('hashchange', updateButtonVisibility);

    // 打开模态窗口
    mainBtn.addEventListener('click', function() {
        modalOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
        updateButtonVisibility(); // 每次打开时更新按钮状态
    });

    // 关闭模态窗口
    closeBtn.addEventListener('click', function() {
        modalOverlay.classList.remove('active');
        document.body.style.overflow = '';
    });

    // 点击模态窗口背景也可关闭
    modalOverlay.addEventListener('click', function(e) {
        if (e.target === modalOverlay) {
            modalOverlay.classList.remove('active');
            document.body.style.overflow = '';
        }
    });

    // 为子按钮添加点击效果
    subBtns.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();

            // 添加点击反馈
            this.style.transform = 'translateY(-3px) scale(0.95)';

            setTimeout(() => {
                this.style.transform = '';
            }, 200);
        });
    });

    // ESC键关闭模态窗口
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && modalOverlay.classList.contains('active')) {
            modalOverlay.classList.remove('active');
            document.body.style.overflow = '';
        }
    });
});

// 禁用右键菜单
document.addEventListener('contextmenu', function(e) {
    e.preventDefault();

    // 显示自定义菜单
    const menu = document.getElementById('customMenu');
    menu.style.display = 'block';

    // 获取视口尺寸和滚动位置
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const scrollX = window.scrollX || window.pageXOffset;
    const scrollY = window.scrollY || window.pageYOffset;

    // 获取菜单尺寸
    const menuWidth = menu.offsetWidth;
    const menuHeight = menu.offsetHeight;

    // 计算鼠标在视口中的位置（考虑滚动）
    const mouseX = e.clientX;
    const mouseY = e.clientY;

    // 计算菜单位置，确保不会超出视口
    let menuX = mouseX;
    let menuY = mouseY;

    // 水平方向调整：如果右边超出，显示在左边
    if (menuX + menuWidth > viewportWidth) {
        menuX = viewportWidth - menuWidth - 5;
    }

    // 垂直方向调整：如果底部超出，显示在上边
    if (menuY + menuHeight > viewportHeight) {
        menuY = viewportHeight - menuHeight - 5;
    }

    // 确保位置不小于0
    menuX = Math.max(5, menuX);
    menuY = Math.max(5, menuY);

    // 设置菜单位置（相对于视口）
    menu.style.left = menuX + 'px';
    menu.style.top = menuY + 'px';
    menu.style.position = 'fixed'; // 使用fixed定位

    // 显示鼠标位置（调试用）
    const mousePos = document.getElementById('mousePosition');
    mousePos.textContent = `视口X: ${mouseX}, 视口Y: ${mouseY}\n页面X: ${e.pageX}, 页面Y: ${e.pageY}\n滚动X: ${scrollX}, 滚动Y: ${scrollY}`;
    mousePos.style.display = 'block';

    setTimeout(() => {
        mousePos.style.display = 'none';
    }, 3000);
});

// 点击其他地方隐藏菜单
document.addEventListener('click', function(e) {
    const menu = document.getElementById('customMenu');
    // 检查点击的不是菜单本身
    if (!menu.contains(e.target) && menu.style.display === 'block') {
        menu.style.display = 'none';
    }
});

// 菜单项点击时也隐藏菜单
document.querySelectorAll('.custom-menu-item').forEach(item => {
    item.addEventListener('click', function() {
        document.getElementById('customMenu').style.display = 'none';
    });
});

// 显示通知
function showNotification(message) {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.style.display = 'block';

    setTimeout(function() {
        notification.style.display = 'none';
    }, 2000);
}

// 添加键盘事件监听器
document.addEventListener('keydown', function(e) {
    if (e.key === 'F12') {
        e.preventDefault();
        showNotification('开发者工具已禁用');
    }

    if (e.ctrlKey && e.key === 'u') {
        e.preventDefault();
        showNotification('查看源代码功能已禁用');
    }

    if (e.ctrlKey && e.shiftKey && e.key === 'I') {
        e.preventDefault();
        showNotification('开发者工具已禁用');
    }
});

// 防止拖拽图片
document.addEventListener('dragstart', function(e) {
    if (e.target.tagName === 'IMG') {
        e.preventDefault();
    }
});

// 窗口调整大小时隐藏菜单
window.addEventListener('resize', function() {
    document.getElementById('customMenu').style.display = 'none';
});

// 滚动时隐藏菜单
window.addEventListener('scroll', function() {
    document.getElementById('customMenu').style.display = 'none';
});

// ESC键隐藏菜单
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        document.getElementById('customMenu').style.display = 'none';
    }
});

function refreshPage() {
    showNotification('正在刷新页面...');
    setTimeout(() => {
        window.location.reload();
    }, 500);
}

// 在文档3的适当位置添加以下代码（建议放在DOMContentLoaded事件监听器内）

document.addEventListener('DOMContentLoaded', function() {
    // 其他初始化代码...

    // 加载页面配置并生成切换按钮
    loadPagesConfig();

    // 其他初始化代码...
});

// 动态加载页面配置并生成切换按钮
function loadPagesConfig() {
    // 使用硬编码的pages变量作为示例
    const pages = [
        {
            "name": "妙妙",
            "path": "index.html",
            "avatar": "miaomiao-image/avatar.jpg"
        },
        {
            "name": "烛风",
            "path": "wispyn.html",
            "avatar": "wispyn-image/avatar.png"
        },
    ];

    const buttonsGrid = document.querySelector('.buttons-grid');
    if (!buttonsGrid) {
        console.error('无法找到按钮容器元素');
        return;
    }

    // 清空现有按钮
    buttonsGrid.innerHTML = '';

    // 获取当前页面路径
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';

    // 为每个页面创建按钮
    pages.forEach(page => {
        // 如果当前页面就是配置中的页面，则不显示该按钮
        if (page.path === currentPage) return;

        const button = document.createElement('a');
        button.className = 'sub-btn';
        button.href = page.path;
        button.target = '_blank';

        // 创建头像图片元素
        const avatarImg = document.createElement('img');
        avatarImg.className = 'avatar3';
        avatarImg.src = page.avatar;
        avatarImg.alt = page.name;
        avatarImg.loading = 'lazy';

        // 创建图标容器
        const icon = document.createElement('i');
        icon.className = 'fas fa-home';
        icon.appendChild(avatarImg);

        // 创建名称span
        const nameSpan = document.createElement('span');
        nameSpan.textContent = page.name;

        // 组装按钮
        button.appendChild(icon);
        button.appendChild(nameSpan);

        buttonsGrid.appendChild(button);
    });

    // 如果没有其他页面可切换，显示提示
    if (buttonsGrid.children.length === 0) {
        const warn = document.querySelector('.warn') || document.createElement('h4');
        warn.className = 'warn';
        warn.textContent = '🐾🐾已展示全部兽兽🐾🐾';
        buttonsGrid.appendChild(warn);
    }
}

// 动态调整轮播图高度
function adjustCarouselHeight() {
    const carouselContainer = document.querySelector('.carousel-container');
    const carouselSlides = document.querySelector('.carousel-slides');
    const slides = document.querySelectorAll('.carousel-slide');

    // 重置高度，让浏览器重新计算
    carouselSlides.style.height = 'auto';
    carouselContainer.style.height = 'auto';

    // 获取当前活动slide的高度
    const activeIndex = Math.round(carouselSlides.scrollLeft / carouselSlides.offsetWidth);
    const activeSlide = slides[activeIndex];

    if (activeSlide) {
        const slideHeight = activeSlide.offsetHeight;
        // 设置容器高度为当前活动slide的高度
        carouselSlides.style.height = slideHeight + 'px';
        carouselContainer.style.height = slideHeight + 'px';
    }
}

// 初始化
window.addEventListener('load', function() {
    // 等待所有图片加载完成
    const images = document.querySelectorAll('.carousel-slide img');
    let loadedCount = 0;

    images.forEach(img => {
        if (img.complete) {
            loadedCount++;
        } else {
            img.addEventListener('load', function() {
                loadedCount++;
                if (loadedCount === images.length) {
                    adjustCarouselHeight();
                }
            });
        }
    });

    if (loadedCount === images.length) {
        adjustCarouselHeight();
    }
});

