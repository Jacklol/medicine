(function () {
    'use strict';

    var panel = document.querySelector('[data-theme-tester]');
    if (!panel) return;

    var storageKey = 'medicine-theme-tester';
    var root = document.documentElement;
    var inputs = Array.prototype.slice.call(panel.querySelectorAll('[data-theme-color]'));
    var presetButtons = Array.prototype.slice.call(panel.querySelectorAll('[data-theme-preset]'));
    var resetButton = panel.querySelector('[data-theme-reset]');

    var presets = {
        blood: {
            '--page-bg': '#14080a',
            '--surface-bg': '#071019',
            '--panel-bg': '#0f0507',
            '--accent': '#ff756a',
            '--cool': '#8de8f0',
            '--warm': '#ffb975',
            '--text-main': '#fff8f5',
            '--text-soft': '#d7b5aa'
        },
        clinical: {
            '--page-bg': '#061015',
            '--surface-bg': '#081c24',
            '--panel-bg': '#091318',
            '--accent': '#3bd7c9',
            '--cool': '#76e8ff',
            '--warm': '#f0d28a',
            '--text-main': '#eefcff',
            '--text-soft': '#a9c4ca'
        },
        graphite: {
            '--page-bg': '#090a0d',
            '--surface-bg': '#11151c',
            '--panel-bg': '#0d0f14',
            '--accent': '#c8b6ff',
            '--cool': '#79d5ff',
            '--warm': '#f2a66f',
            '--text-main': '#f6f1ff',
            '--text-soft': '#bdb4cc'
        },
        light: {
            '--page-bg': '#efe9e5',
            '--surface-bg': '#dce9ec',
            '--panel-bg': '#fbf4ef',
            '--accent': '#d84336',
            '--cool': '#2a97ad',
            '--warm': '#b67838',
            '--text-main': '#281715',
            '--text-soft': '#6e5048'
        }
    };

    function applyTheme(theme, activePreset, shouldSave) {
        var next = {};
        Object.keys(presets.blood).forEach(function (key) {
            next[key] = normalizeColor(theme[key] || presets.blood[key]);
            root.style.setProperty(key, next[key]);
        });

        inputs.forEach(function (input) {
            var key = input.getAttribute('data-theme-color');
            if (next[key]) input.value = next[key];
        });

        presetButtons.forEach(function (button) {
            button.setAttribute('aria-pressed', button.getAttribute('data-theme-preset') === activePreset ? 'true' : 'false');
        });

        if (shouldSave) {
            try {
                localStorage.setItem(storageKey, JSON.stringify({
                    preset: activePreset || '',
                    theme: next
                }));
            } catch (error) {
                return;
            }
        }
    }

    function normalizeColor(value) {
        return /^#[0-9a-f]{6}$/i.test(value) ? value.toLowerCase() : '#000000';
    }

    function readSavedTheme() {
        try {
            return JSON.parse(localStorage.getItem(storageKey) || 'null');
        } catch (error) {
            return null;
        }
    }

    presetButtons.forEach(function (button) {
        button.addEventListener('click', function () {
            var name = button.getAttribute('data-theme-preset');
            if (!presets[name]) return;
            applyTheme(presets[name], name, true);
        });
    });

    inputs.forEach(function (input) {
        input.addEventListener('input', function () {
            var custom = getCurrentTheme();
            inputs.forEach(function (item) {
                custom[item.getAttribute('data-theme-color')] = item.value;
            });
            applyTheme(custom, '', true);
        });
    });

    if (resetButton) {
        resetButton.addEventListener('click', function () {
            applyTheme(presets.blood, 'blood', true);
        });
    }

    var saved = readSavedTheme();
    if (saved && saved.theme) {
        applyTheme(saved.theme, saved.preset, false);
    } else {
        applyTheme(presets.blood, 'blood', false);
    }

    function getCurrentTheme() {
        var styles = getComputedStyle(root);
        var theme = {};
        Object.keys(presets.blood).forEach(function (key) {
            theme[key] = normalizeColor(styles.getPropertyValue(key).trim() || presets.blood[key]);
        });
        return theme;
    }
}());
