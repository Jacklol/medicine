(function () {
    'use strict';

    var section = document.querySelector('[data-lens-aging]');
    if (!section) return;

    var title = section.querySelector('.lens-stage-title');
    var body = section.querySelector('.lens-stage-body');
    var slider = section.querySelector('.lens-progress-slider');
    var sliderValue = section.querySelector('.lens-slider-value');
    var steps = Array.prototype.slice.call(section.querySelectorAll('.lens-timeline span'));

    var copy = [
        {
            title: 'Clear young lens',
            body: 'High contrast, neutral color, and a sharp retinal image.',
            label: '20 years'
        },
        {
            title: 'Early lens aging',
            body: 'The view begins to warm slightly as the lens transmits less clean light.',
            label: '45 years'
        },
        {
            title: 'Dense yellowing',
            body: 'Contrast falls and fine details become harder to separate.',
            label: '65 years'
        },
        {
            title: 'Clouded lens',
            body: 'Scattered light creates blur, glare, and a lower-detail picture.',
            label: '78 years'
        },
        {
            title: 'New clear lens',
            body: 'The haze clears and the image returns to a crisp, neutral focus.',
            label: 'New lens'
        }
    ];

    function update(progress) {
        var aging = clamp(progress / 0.7, 0, 1);
        var implant = clamp((progress - 0.64) / 0.24, 0, 1);
        var severity = aging * (1 - implant);
        var finalClarity = smoothstep(0.02, 0.86, implant);

        var blur = severity * 11.5;
        var yellow = severity * 0.86;
        var contrast = 1.08 - severity * 0.42 + finalClarity * 0.18;
        var brightness = 1 - severity * 0.13 + finalClarity * 0.07;
        var oldLensOpacity = severity * 0.86;
        var newLensOpacity = finalClarity * 0.82;

        section.style.setProperty('--lens-blur', Math.max(0, blur).toFixed(2) + 'px');
        section.style.setProperty('--lens-yellow', yellow.toFixed(3));
        section.style.setProperty('--lens-contrast', contrast.toFixed(3));
        section.style.setProperty('--lens-brightness', brightness.toFixed(3));
        section.style.setProperty('--old-lens-opacity', oldLensOpacity.toFixed(3));
        section.style.setProperty('--new-lens-opacity', newLensOpacity.toFixed(3));
        section.style.setProperty('--timeline-progress', (progress * 100).toFixed(1) + '%');
        section.style.setProperty('--slider-progress', (progress * 100).toFixed(1) + '%');
        section.setAttribute('data-lens-progress', progress.toFixed(3));

        var index = getStageIndex(progress);
        title.textContent = copy[index].title;
        body.textContent = copy[index].body;
        if (sliderValue) sliderValue.textContent = copy[index].label;
        for (var i = 0; i < steps.length; i++) {
            steps[i].classList.toggle('is-active', i === index);
        }
    }

    function getStageIndex(progress) {
        if (progress < 0.2) return 0;
        if (progress < 0.42) return 1;
        if (progress < 0.64) return 2;
        if (progress < 0.82) return 3;
        return 4;
    }

    function setProgress(progress) {
        progress = clamp(progress, 0, 1);
        if (slider) slider.value = Math.round(progress * 100);
        update(progress);
    }

    function onSliderInput() {
        setProgress((Number(slider.value) || 0) / 100);
    }

    function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    function smoothstep(edge0, edge1, value) {
        var t = clamp((value - edge0) / (edge1 - edge0), 0, 1);
        return t * t * (3 - 2 * t);
    }

    if (slider) {
        slider.addEventListener('input', onSliderInput);
    }
    setProgress(0);
}());
