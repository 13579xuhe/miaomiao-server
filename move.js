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