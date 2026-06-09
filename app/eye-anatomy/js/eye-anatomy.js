(function () {
    'use strict';

    var THREE = window.THREE;
    var scene;
    var camera;
    var renderer;
    var eyeRoot;
    var frontEyeGroup;
    var raycaster;
    var mouse;
    var partObjects = [];
    var hotObjects = [];
    var hitAreaObjects = [];
    var frontEyeObjects = [];
    var revealObjects = [];
    var activePartId = 'lens';
    var hoverPartId = null;
    var width = 1;
    var height = 1;
    var isDragging = false;
    var lastPointerX = 0;
    var lastPointerY = 0;
    var targetRotationX = -0.04;
    var targetRotationY = -0.22;
    var currentRotationX = -0.04;
    var currentRotationY = -0.22;
    var explodeTarget = 0;
    var explodeProgress = 0;
    var startTime = Date.now();
    var revealEnabledAt = startTime + 1200;
    var isShowcaseMode = /\bshowcase=1\b/.test(window.location.search);
    var isEmbeddedMode = /\bembed=1\b/.test(window.location.search);

    var panelTitle;
    var panelBody;
    var panelMeta;
    var hoverTag;
    var partDock;

    var primaryPartIds = {
        cornea: true,
        iris: true,
        lens: true,
        retina: true,
        opticNerve: true
    };

    var parts = {
        cornea: {
            title: 'Cornea',
            chip: 'Cornea',
            body: 'Clear curved front surface that starts the focusing path and protects the front of the eye.',
            meta: 'Transparent front dome',
            accent: 0x8de8f0,
            priority: 8
        },
        iris: {
            title: 'Iris and pupil',
            chip: 'Iris',
            body: 'Pigmented ring that changes the pupil opening and controls how much light enters the eye.',
            meta: 'Light aperture',
            accent: 0x38b7c8,
            priority: 9
        },
        lens: {
            title: 'Crystalline lens',
            chip: 'Lens',
            body: 'Transparent biconvex tissue that works with the cornea to focus light on the retina.',
            meta: 'Lens focus',
            accent: 0xffd18a,
            priority: 10
        },
        retina: {
            title: 'Retina',
            chip: 'Retina',
            body: 'Light-sensitive tissue lining the back of the eye, where focused light becomes neural signal.',
            meta: 'Light-sensitive layer',
            accent: 0xff4134,
            priority: 8
        },
        opticNerve: {
            title: 'Optic nerve',
            chip: 'Optic nerve',
            body: 'Bundle carrying retinal signals from the back of the eye toward the visual pathways.',
            meta: 'Signal cable',
            accent: 0xffc39a,
            priority: 7
        }
    };

    var partOrder = ['cornea', 'iris', 'lens', 'retina', 'opticNerve'];
    var layerOffsets = {
        cornea: new THREE.Vector3(-72, 0, 26),
        iris: new THREE.Vector3(-48, 0, 16),
        lens: new THREE.Vector3(-18, 0, 2),
        ciliary: new THREE.Vector3(-4, 0, -4),
        vitreous: new THREE.Vector3(30, 0, -8),
        retina: new THREE.Vector3(72, 0, -16),
        sclera: new THREE.Vector3(8, 0, -34),
        opticNerve: new THREE.Vector3(112, -4, -22)
    };

    init();
    animate();

    function init() {
        if (isShowcaseMode) {
            document.documentElement.classList.add('is-showcase');
            targetRotationX = 0;
            targetRotationY = 0;
            currentRotationX = targetRotationX;
            currentRotationY = targetRotationY;
        }

        panelTitle = document.querySelector('.eye-part-title');
        panelBody = document.querySelector('.eye-part-body');
        panelMeta = document.querySelector('.eye-part-meta');
        hoverTag = document.querySelector('.hover-tag');
        partDock = document.querySelector('.part-dock');

        scene = new THREE.Scene();
        scene.fog = new THREE.FogExp2(0x071019, 0.0016);

        camera = new THREE.PerspectiveCamera(isShowcaseMode ? 38 : 40, 1, 1, 1800);
        camera.position.set(0, isShowcaseMode ? 4 : 18, isShowcaseMode ? 560 : (isEmbeddedMode ? 500 : 650));
        camera.lookAt(new THREE.Vector3(0, 0, 0));

        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setClearColor(0x071019, 0);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        document.body.appendChild(renderer.domElement);

        scene.add(new THREE.AmbientLight(0x53606a));

        var key = new THREE.PointLight(0xbdefff, 0.9, 900);
        key.position.set(-240, 220, 360);
        scene.add(key);

        var warm = new THREE.PointLight(0xff4e3d, 0.62, 820);
        warm.position.set(220, -120, 280);
        scene.add(warm);

        var lensLight = new THREE.PointLight(0xffd18a, 0.8, 340);
        lensLight.position.set(-52, 6, 130);
        scene.add(lensLight);

        eyeRoot = new THREE.Object3D();
        eyeRoot.rotation.x = currentRotationX;
        eyeRoot.rotation.y = currentRotationY;
        if (isShowcaseMode) {
            eyeRoot.scale.set(1.18, 1.18, 1.18);
            eyeRoot.position.set(0, 0, 0);
        } else if (isEmbeddedMode) {
            eyeRoot.scale.set(1.22, 1.22, 1.22);
            eyeRoot.position.set(58, -16, 0);
        }
        scene.add(eyeRoot);

        raycaster = new THREE.Raycaster();
        mouse = new THREE.Vector2();

        buildDock();
        buildEye();
        bindEvents();
        setActivePart(activePartId);

        renderer.domElement.setAttribute('data-eye-ready', 'true');
        window.addEventListener('resize', onResize);
        onResize();
    }

    function buildDock() {
        if (isShowcaseMode) return;
        partDock.innerHTML = '';
        partOrder.forEach(function (id) {
            var button = document.createElement('button');
            button.className = 'part-chip';
            button.type = 'button';
            button.setAttribute('data-part', id);
            button.textContent = parts[id].chip || parts[id].title;
            button.addEventListener('mouseenter', function () {
                explodeTarget = 1;
                setActivePart(id);
            });
            button.addEventListener('focus', function () {
                explodeTarget = 1;
                setActivePart(id);
            });
            button.addEventListener('click', function () {
                explodeTarget = 1;
                setActivePart(id);
            });
            partDock.appendChild(button);
        });
    }

    function buildEye() {
        addBackgroundParticles();
        addSclera();
        addRetina();
        addVitreous();
        addAnteriorStructures();
        addOpticNerve();
        addLightPath();
        addPrimaryHitAreas();
        addNormalEye();
    }

    function addBackgroundParticles() {
        var count = 210;
        var positions = new Float32Array(count * 3);
        for (var i = 0; i < count; i++) {
            positions[i * 3] = -260 + Math.random() * 520;
            positions[i * 3 + 1] = -150 + Math.random() * 300;
            positions[i * 3 + 2] = -130 + Math.random() * 120;
        }
        var geometry = new THREE.BufferGeometry();
        geometry.addAttribute('position', new THREE.BufferAttribute(positions, 3));
        var points = new THREE.Points(geometry, new THREE.PointsMaterial({
            color: 0x88dce2,
            size: 1.6,
            transparent: true,
            opacity: 0.18,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        }));
        scene.add(points);
    }

    function addSclera() {
        var shellMaterial = new THREE.MeshPhongMaterial({
            color: 0xf8eee7,
            emissive: 0x14100f,
            specular: 0xffffff,
            shininess: 18,
            transparent: true,
            opacity: 0.15,
            side: THREE.DoubleSide,
            depthWrite: false
        });
        var shell = new THREE.Mesh(new THREE.SphereGeometry(112, 56, 28), shellMaterial);
        shell.scale.set(1.34, 1.0, 0.54);
        shell.position.set(4, 0, -6);
        eyeRoot.add(shell);
        registerHotObject(shell, 'sclera');

        addArcSegments('sclera', 4, 0, 154, 112, -Math.PI, Math.PI, 18, 4.2, makeMaterial(0xf7ebe1, 0.72, 0x16100f), 112);
        addArcSegments('sclera', 4, 0, 142, 102, -Math.PI * 0.86, Math.PI * 0.86, 24, 1.8, makeMaterial(0xffffff, 0.32, 0x121010), 74);
    }

    function addRetina() {
        addArcSegments('retina', 6, 0, 130, 91, -1.25, 1.25, 42, 4.8, makeMaterial(0xff3a32, 0.72, 0x2b0304), 52);
        addArcSegments('retina', 8, 0, 122, 83, -1.16, 1.16, 47, 1.55, makeMaterial(0xff9b64, 0.42, 0x220204), 48);
        addArcSegments('retina', 6, 0, 139, 99, -1.18, 1.18, 36, 2.4, makeMaterial(0x74151d, 0.5, 0x120203), 46);

        var macula = addEllipsoid('retina', 14, { x: 0.7, y: 0.7, z: 0.22 }, { x: 126, y: 0, z: 55 }, 0xffb15d, 0.72, {
            emissive: 0x3a0804,
            shininess: 16
        });
        macula.name = 'macula';

        addRetinalVessels();
    }

    function addRetinalVessels() {
        var red = makeMaterial(0xff4e3d, 0.56, 0x240303);
        var blue = makeMaterial(0x435c9a, 0.48, 0x050814);
        addCurveLine('retina', [new THREE.Vector3(113, 8, 61), new THREE.Vector3(82, 34, 58), new THREE.Vector3(48, 52, 50)], 1.8, red);
        addCurveLine('retina', [new THREE.Vector3(115, -3, 62), new THREE.Vector3(78, -34, 57), new THREE.Vector3(40, -54, 48)], 1.7, blue);
        addCurveLine('retina', [new THREE.Vector3(122, 0, 62), new THREE.Vector3(96, 0, 60), new THREE.Vector3(68, 4, 56)], 1.4, red);
    }

    function addVitreous() {
        addEllipsoid('vitreous', 86, { x: 1.1, y: 0.78, z: 0.4 }, { x: 30, y: 0, z: 34 }, 0x90e4ec, 0.11, {
            emissive: 0x061b22,
            specular: 0xd8fbff,
            shininess: 36,
            depthWrite: false
        });
        addArcSegments('vitreous', 26, 0, 94, 65, -0.8, 0.8, 58, 1.2, makeMaterial(0xb6f8fb, 0.16, 0x071d24), 28);
    }

    function addAnteriorStructures() {
        addEllipsoid('cornea', 43, { x: 0.42, y: 0.9, z: 0.46 }, { x: -148, y: 0, z: 39 }, 0xb9fbff, 0.48, {
            emissive: 0x08242b,
            specular: 0xffffff,
            shininess: 72,
            depthWrite: false
        });
        addArcSegments('cornea', -150, 0, 22, 46, -1.32, 1.32, 52, 2.0, makeMaterial(0xe9ffff, 0.38, 0x06252b), 34);

        var irisMaterial = makeMaterial(0x27c5d5, 0.82, 0x052b31);
        var iris = new THREE.Mesh(new THREE.TorusGeometry(29, 5.6, 14, 76), irisMaterial);
        iris.position.set(-105, 0, 56);
        iris.scale.set(0.92, 1.0, 1.0);
        eyeRoot.add(iris);
        registerHotObject(iris, 'iris');

        var pupil = new THREE.Mesh(new THREE.CircleGeometry(16, 48), new THREE.MeshBasicMaterial({
            color: 0x030507,
            transparent: true,
            opacity: 0.9,
            side: THREE.DoubleSide
        }));
        pupil.position.set(-105, 0, 57);
        eyeRoot.add(pupil);
        registerHotObject(pupil, 'iris');

        addIrisFibers();

        addEllipsoid('lens', 39, { x: 0.5, y: 0.9, z: 0.34 }, { x: -58, y: 0, z: 45 }, 0xffd99b, 0.5, {
            emissive: 0x2a1602,
            specular: 0xffffef,
            shininess: 76,
            depthWrite: false
        });
        addEllipsoid('lens', 42, { x: 0.6, y: 0.98, z: 0.38 }, { x: -52, y: 0, z: 45 }, 0xffd18a, 0.08, {
            emissive: 0x160b01,
            specular: 0xffffef,
            shininess: 42,
            depthWrite: false
        });
        addLensLamellae();

        var ciliaryMaterial = makeMaterial(0xdb3b34, 0.64, 0x250204);
        var ciliary = new THREE.Mesh(new THREE.TorusGeometry(50, 4.4, 12, 80), ciliaryMaterial);
        ciliary.position.set(-59, 0, 43);
        ciliary.scale.set(0.62, 1.0, 1.0);
        eyeRoot.add(ciliary);
        registerHotObject(ciliary, 'ciliary');

        addZonules();
    }

    function addIrisFibers() {
        var materialA = makeMaterial(0x67e0e4, 0.52, 0x031d22);
        var materialB = makeMaterial(0x125f78, 0.52, 0x02131c);
        for (var i = 0; i < 34; i++) {
            var angle = (i / 34) * Math.PI * 2;
            var inner = new THREE.Vector3(-105 + Math.cos(angle) * 14, Math.sin(angle) * 14, 58);
            var outer = new THREE.Vector3(-105 + Math.cos(angle) * 31, Math.sin(angle) * 31, 58);
            addSegment('iris', inner, outer, 0.8, i % 2 ? materialA : materialB, 6);
        }
    }

    function addLensLamellae() {
        addArcSegments('lens', -58, 0, 20, 34, -Math.PI, Math.PI, 62, 0.9, makeMaterial(0xffefd0, 0.28, 0x261102), 48);
        addArcSegments('lens', -58, 0, 14, 26, -Math.PI, Math.PI, 63, 0.8, makeMaterial(0xfff4dd, 0.25, 0x261102), 42);
        addArcSegments('lens', -58, 0, 8, 17, -Math.PI, Math.PI, 64, 0.7, makeMaterial(0xfff8e8, 0.22, 0x261102), 34);
    }

    function addZonules() {
        var material = makeMaterial(0xffe3b9, 0.38, 0x1b0e02);
        for (var i = 0; i < 18; i++) {
            var angle = -1.16 + (i / 17) * 2.32;
            var lensPoint = new THREE.Vector3(-58 + Math.cos(angle) * 24, Math.sin(angle) * 37, 61);
            var ringPoint = new THREE.Vector3(-58 + Math.cos(angle) * 34, Math.sin(angle) * 51, 51);
            addSegment('ciliary', lensPoint, ringPoint, 0.9, material, 6);
        }
    }

    function addOpticNerve() {
        var nerveMaterial = makeMaterial(0xf1b58a, 0.64, 0x26100a);
        addSegment('opticNerve', new THREE.Vector3(134, -6, 28), new THREE.Vector3(240, -14, 12), 16, nerveMaterial, 18);

        var bundleA = makeMaterial(0xffd0a7, 0.44, 0x241006);
        var bundleB = makeMaterial(0xd08a6d, 0.36, 0x170804);
        for (var i = 0; i < 7; i++) {
            var offset = -12 + i * 4;
            addSegment('opticNerve', new THREE.Vector3(136, offset, 42), new THREE.Vector3(238, offset * 0.42 - 8, 25), 1.6, i % 2 ? bundleA : bundleB, 6);
        }
    }

    function addLightPath() {
        if (isShowcaseMode) return;
        var material = makeMaterial(0xffe6a8, 0.24, 0x281702);
        addSegment(null, new THREE.Vector3(-190, 34, 76), new THREE.Vector3(-62, 10, 72), 1.0, material, 6);
        addSegment(null, new THREE.Vector3(-190, -34, 76), new THREE.Vector3(-62, -10, 72), 1.0, material, 6);
        addSegment(null, new THREE.Vector3(-62, 10, 72), new THREE.Vector3(124, 0, 72), 1.0, material, 6);
        addSegment(null, new THREE.Vector3(-62, -10, 72), new THREE.Vector3(124, 0, 72), 1.0, material, 6);
    }

    function addPrimaryHitAreas() {
        addHitArea('cornea', 44, { x: 0.48, y: 1.06, z: 0.42 }, { x: -148, y: 0, z: 76 });
        addHitArea('iris', 40, { x: 0.82, y: 0.92, z: 0.26 }, { x: -104, y: 0, z: 77 });
        addHitArea('lens', 48, { x: 0.62, y: 1.02, z: 0.3 }, { x: -55, y: 0, z: 72 });
        addHitArea('retina', 68, { x: 0.52, y: 1.16, z: 0.26 }, { x: 120, y: 0, z: 68 });
        addHitArea('opticNerve', 60, { x: 1.25, y: 0.52, z: 0.34 }, { x: 194, y: -8, z: 38 });
    }

    function addHitArea(partId, radius, scale, position) {
        var mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 24, 12), new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0,
            depthWrite: false,
            side: THREE.DoubleSide
        }));
        mesh.scale.set(scale.x, scale.y, scale.z);
        mesh.position.set(position.x, position.y, position.z);
        mesh.userData.eyePart = partId;
        mesh.userData.basePosition = mesh.position.clone();
        mesh.userData.baseScale = mesh.scale.clone();
        eyeRoot.add(mesh);
        hotObjects.push(mesh);
        hitAreaObjects.push(mesh);
        return mesh;
    }

    function addNormalEye() {
        frontEyeGroup = new THREE.Object3D();
        frontEyeGroup.position.set(-24, 0, 118);
        eyeRoot.add(frontEyeGroup);

        addFrontMesh(new THREE.Mesh(
            new THREE.SphereGeometry(82, 64, 28),
            makeFrontMaterial(0xfff5ef, 0.96, 0x211514, 0xffffff, 34)
        ), {
            scale: new THREE.Vector3(1.48, 0.7, 0.16),
            position: new THREE.Vector3(0, 0, 0)
        });

        addFrontArc(0, 2, 126, 63, 18, 0.14 * Math.PI, 0.86 * Math.PI, 52, 4.8, makeFrontMaterial(0xb56d63, 0.58, 0x240807, 0xffc1b7, 18));
        addFrontArc(0, -4, 124, 54, 18, 1.13 * Math.PI, 1.87 * Math.PI, 52, 3.9, makeFrontMaterial(0x7f4545, 0.48, 0x210707, 0xffb6aa, 16));
        addFrontArc(0, 2, 119, 58, 20, 0.18 * Math.PI, 0.82 * Math.PI, 48, 1.5, makeFrontMaterial(0xffe2d8, 0.36, 0x1a0908, 0xffffff, 24));

        addFrontVeins();

        addFrontMesh(new THREE.Mesh(
            new THREE.CircleGeometry(31, 72),
            new THREE.MeshBasicMaterial({
                color: 0x2ac8d8,
                transparent: true,
                opacity: 0.88,
                side: THREE.DoubleSide
            })
        ), {
            position: new THREE.Vector3(0, 0, 12)
        });

        addFrontIrisFibers();

        addFrontMesh(new THREE.Mesh(
            new THREE.TorusGeometry(31, 1.6, 10, 92),
            makeFrontMaterial(0x0b6472, 0.72, 0x041920, 0xcfffff, 22)
        ), {
            position: new THREE.Vector3(0, 0, 13.3)
        });

        addFrontMesh(new THREE.Mesh(
            new THREE.TorusGeometry(20, 2.1, 12, 80),
            makeFrontMaterial(0x91fcff, 0.62, 0x06383e, 0xffffff, 24)
        ), {
            position: new THREE.Vector3(0, 0, 13)
        });

        addFrontMesh(new THREE.Mesh(
            new THREE.CircleGeometry(12, 48),
            new THREE.MeshBasicMaterial({
                color: 0x020305,
                transparent: true,
                opacity: 0.96,
                side: THREE.DoubleSide
            })
        ), {
            position: new THREE.Vector3(0, 0, 15)
        });

        addFrontMesh(new THREE.Mesh(
            new THREE.SphereGeometry(36, 40, 18),
            makeFrontMaterial(0xeaffff, 0.26, 0x08242b, 0xffffff, 92)
        ), {
            scale: new THREE.Vector3(1.14, 1.02, 0.2),
            position: new THREE.Vector3(0, 0, 18)
        });

        addFrontMesh(new THREE.Mesh(
            new THREE.CircleGeometry(18, 32),
            new THREE.MeshBasicMaterial({
                color: 0xffffff,
                transparent: true,
                opacity: 0.32,
                side: THREE.DoubleSide
            })
        ), {
            scale: new THREE.Vector3(0.62, 0.22, 1),
            position: new THREE.Vector3(-15, 16, 21)
        });

        addFrontMesh(new THREE.Mesh(
            new THREE.CircleGeometry(9, 24),
            new THREE.MeshBasicMaterial({
                color: 0xffffff,
                transparent: true,
                opacity: 0.22,
                side: THREE.DoubleSide
            })
        ), {
            scale: new THREE.Vector3(0.48, 0.24, 1),
            position: new THREE.Vector3(15, -10, 21.5)
        });
    }

    function addFrontVeins() {
        var veinMaterial = makeFrontMaterial(0xc82726, 0.26, 0x180202, 0xffb0a4, 18);
        addFrontSegment(new THREE.Vector3(-86, 17, 11), new THREE.Vector3(-42, 6, 12), 0.95, veinMaterial);
        addFrontSegment(new THREE.Vector3(-96, -18, 11), new THREE.Vector3(-48, -8, 12), 0.85, veinMaterial);
        addFrontSegment(new THREE.Vector3(88, 16, 11), new THREE.Vector3(43, 5, 12), 0.92, veinMaterial);
        addFrontSegment(new THREE.Vector3(94, -16, 11), new THREE.Vector3(48, -8, 12), 0.85, veinMaterial);
        addFrontSegment(new THREE.Vector3(-70, 33, 11), new THREE.Vector3(-34, 20, 12), 0.62, veinMaterial);
        addFrontSegment(new THREE.Vector3(70, 31, 11), new THREE.Vector3(34, 17, 12), 0.62, veinMaterial);
    }

    function addFrontIrisFibers() {
        var bright = makeFrontMaterial(0xa4ffff, 0.34, 0x06333b, 0xffffff, 16);
        var deep = makeFrontMaterial(0x0d7f91, 0.32, 0x03151a, 0xa4ffff, 14);
        for (var i = 0; i < 44; i++) {
            var angle = (i / 44) * Math.PI * 2;
            var inner = new THREE.Vector3(Math.cos(angle) * 13, Math.sin(angle) * 13, 14.8);
            var outer = new THREE.Vector3(Math.cos(angle) * (28 + Math.sin(i * 1.7) * 2), Math.sin(angle) * (28 + Math.cos(i * 1.3) * 2), 14.8);
            addFrontSegment(inner, outer, i % 3 === 0 ? 0.62 : 0.42, i % 2 ? bright : deep);
        }
    }

    function addFrontArc(centerX, centerY, radiusX, radiusY, z, startAngle, endAngle, segmentCount, radius, material) {
        for (var i = 0; i < segmentCount; i++) {
            var t0 = startAngle + (endAngle - startAngle) * (i / segmentCount);
            var t1 = startAngle + (endAngle - startAngle) * ((i + 1) / segmentCount);
            addFrontSegment(
                new THREE.Vector3(centerX + Math.cos(t0) * radiusX, centerY + Math.sin(t0) * radiusY, z),
                new THREE.Vector3(centerX + Math.cos(t1) * radiusX, centerY + Math.sin(t1) * radiusY, z),
                radius,
                material
            );
        }
    }

    function addFrontSegment(start, end, radius, material) {
        var direction = new THREE.Vector3().subVectors(end, start);
        var length = direction.length();
        var mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, 6, 1, true), material);
        mesh.position.copy(start).add(end).multiplyScalar(0.5);
        mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
        return addFrontMesh(mesh);
    }

    function addFrontMesh(mesh, options) {
        options = options || {};
        if (options.scale) mesh.scale.copy(options.scale);
        if (options.position) mesh.position.copy(options.position);
        frontEyeGroup.add(mesh);
        var materials = getMaterials(mesh);
        for (var i = 0; i < materials.length; i++) {
            materials[i].transparent = true;
            materials[i].userData = materials[i].userData || {};
            materials[i].userData.frontBaseOpacity = materials[i].opacity === undefined ? 1 : materials[i].opacity;
        }
        frontEyeObjects.push(mesh);
        return mesh;
    }

    function makeFrontMaterial(color, opacity, emissive, specular, shininess) {
        return new THREE.MeshPhongMaterial({
            color: color,
            emissive: emissive || 0x000000,
            specular: specular || 0xffffff,
            shininess: shininess || 20,
            transparent: true,
            opacity: opacity,
            side: THREE.DoubleSide,
            depthWrite: false
        });
    }

    function addEllipsoid(partId, radius, scale, position, color, opacity, options) {
        options = options || {};
        var material = new THREE.MeshPhongMaterial({
            color: color,
            emissive: options.emissive || 0x000000,
            specular: options.specular || 0xffffff,
            shininess: options.shininess === undefined ? 24 : options.shininess,
            transparent: true,
            opacity: opacity,
            side: THREE.DoubleSide,
            depthWrite: options.depthWrite === undefined ? true : options.depthWrite
        });
        var mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 48, 24), material);
        mesh.scale.set(scale.x, scale.y, scale.z);
        mesh.position.set(position.x, position.y, position.z);
        eyeRoot.add(mesh);
        if (partId) {
            registerHotObject(mesh, partId);
        } else {
            registerRevealObject(mesh);
        }
        return mesh;
    }

    function addArcSegments(partId, centerX, centerY, radiusX, radiusY, startAngle, endAngle, z, tubeRadius, material, segmentCount) {
        for (var i = 0; i < segmentCount; i++) {
            var t0 = startAngle + (endAngle - startAngle) * (i / segmentCount);
            var t1 = startAngle + (endAngle - startAngle) * ((i + 1) / segmentCount);
            var p0 = new THREE.Vector3(centerX + Math.cos(t0) * radiusX, centerY + Math.sin(t0) * radiusY, z);
            var p1 = new THREE.Vector3(centerX + Math.cos(t1) * radiusX, centerY + Math.sin(t1) * radiusY, z);
            addSegment(partId, p0, p1, tubeRadius, material, 8);
        }
    }

    function addCurveLine(partId, points, radius, material) {
        for (var i = 0; i < points.length - 1; i++) {
            var start = points[i];
            var end = points[i + 1];
            var previous = start;
            for (var j = 1; j <= 10; j++) {
                var t = j / 10;
                var current = start.clone().lerp(end, smoothstep(0, 1, t));
                addSegment(partId, previous, current, radius, material, 6);
                previous = current;
            }
        }
    }

    function addSegment(partId, start, end, radius, material, radialSegments) {
        var direction = new THREE.Vector3().subVectors(end, start);
        var length = direction.length();
        if (length < 0.001) return null;
        var geometry = new THREE.CylinderGeometry(radius, radius, length, radialSegments || 8, 1, true);
        var mesh = new THREE.Mesh(geometry, material);
        mesh.position.copy(start).add(end).multiplyScalar(0.5);
        mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize());
        eyeRoot.add(mesh);
        if (partId) registerHotObject(mesh, partId);
        return mesh;
    }

    function makeMaterial(color, opacity, emissive) {
        return new THREE.MeshPhongMaterial({
            color: color,
            emissive: emissive || 0x000000,
            specular: 0xffffff,
            shininess: 20,
            transparent: true,
            opacity: opacity,
            side: THREE.DoubleSide,
            depthWrite: false
        });
    }

    function registerHotObject(mesh, partId) {
        mesh.userData.eyePart = partId;
        mesh.userData.basePosition = mesh.position.clone();
        mesh.userData.baseScale = mesh.scale.clone();
        mesh.userData.baseOpacity = mesh.material.opacity;
        mesh.userData.baseColor = mesh.material.color ? mesh.material.color.getHex() : 0xffffff;
        mesh.userData.baseEmissive = mesh.material.emissive ? mesh.material.emissive.getHex() : 0x000000;
        partObjects.push(mesh);
        if (primaryPartIds[partId]) {
            hotObjects.push(mesh);
        }
    }

    function registerRevealObject(mesh) {
        mesh.userData.baseOpacity = mesh.material && mesh.material.opacity !== undefined ? mesh.material.opacity : 1;
        revealObjects.push(mesh);
    }

    function bindEvents() {
        var canvas = renderer.domElement;
        canvas.addEventListener('mousedown', onPointerDown);
        window.addEventListener('mousemove', onPointerMove);
        window.addEventListener('mouseup', onPointerUp);
        canvas.addEventListener('touchstart', onPointerDown, { passive: false });
        window.addEventListener('touchmove', onPointerMove, { passive: false });
        window.addEventListener('touchend', onPointerUp);
        window.addEventListener('touchcancel', onPointerUp);
        canvas.addEventListener('mouseleave', function () {
            clearHover();
            explodeTarget = 0;
        });
        canvas.addEventListener('mouseout', function () {
            clearHover();
            explodeTarget = 0;
        });
        canvas.addEventListener('dblclick', resetRotation);
    }

    function onPointerDown(event) {
        var point = getPointer(event);
        if (!point) return;
        isDragging = true;
        if (!isShowcaseMode) explodeTarget = 1;
        lastPointerX = point.x;
        lastPointerY = point.y;
        renderer.domElement.classList.add('is-grabbing');
        if (!isShowcaseMode) updateHover(point.x, point.y, true);
        if (event.preventDefault) event.preventDefault();
    }

    function onPointerMove(event) {
        var point = getPointer(event);
        if (!point) return;
        if (isShowcaseMode) {
            if (isDragging) {
                var showcaseDx = point.x - lastPointerX;
                var showcaseDy = point.y - lastPointerY;
                lastPointerX = point.x;
                lastPointerY = point.y;
                targetRotationY += showcaseDx * 0.004;
                targetRotationX += showcaseDy * 0.0025;
                targetRotationX = Math.max(-0.36, Math.min(0.36, targetRotationX));
                if (event.preventDefault) event.preventDefault();
            }
            return;
        }
        var isInCanvas = isPointInsideCanvas(point);
        var isDockEvent = event.target && event.target.closest && event.target.closest('.part-dock');
        if (!isDragging && !isDockEvent && Date.now() < revealEnabledAt) return;
        if (!isDragging && !isInCanvas && !isDockEvent) {
            clearHover();
            explodeTarget = 0;
            return;
        }
        explodeTarget = 1;

        if (isDragging) {
            var dx = point.x - lastPointerX;
            var dy = point.y - lastPointerY;
            lastPointerX = point.x;
            lastPointerY = point.y;
            targetRotationY += dx * 0.006;
            targetRotationX += dy * 0.004;
            targetRotationX = Math.max(-0.62, Math.min(0.58, targetRotationX));
            if (event.preventDefault) event.preventDefault();
        } else {
            updateHover(point.x, point.y, false);
        }
    }

    function onPointerUp() {
        isDragging = false;
        renderer.domElement.classList.remove('is-grabbing');
    }

    function getPointer(event) {
        var touch = event.touches && event.touches.length ? event.touches[0] : null;
        if (!touch && event.changedTouches && event.changedTouches.length) touch = event.changedTouches[0];
        if (touch) return { x: touch.clientX, y: touch.clientY };
        if (event.clientX === undefined || event.clientY === undefined) return null;
        return { x: event.clientX, y: event.clientY };
    }

    function isPointInsideCanvas(point) {
        var rect = renderer.domElement.getBoundingClientRect();
        return point.x >= rect.left &&
            point.x <= rect.right &&
            point.y >= rect.top &&
            point.y <= rect.bottom;
    }

    function updateHover(clientX, clientY, persist) {
        explodeTarget = 1;
        var rect = renderer.domElement.getBoundingClientRect();
        mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);

        var hits = raycaster.intersectObjects(hotObjects, false);
        var hit = chooseHit(hits);
        if (hit) {
            hoverPartId = hit.object.userData.eyePart;
            setActivePart(hoverPartId);
            hoverTag.textContent = parts[hoverPartId].title;
            hoverTag.style.left = clientX + 'px';
            hoverTag.style.top = clientY + 'px';
            hoverTag.style.display = 'block';
            renderer.domElement.setAttribute('data-hover-part', hoverPartId);
        } else {
            clearHover();
        }
    }

    function chooseHit(hits) {
        var chosen = null;
        var chosenScore = -Infinity;
        for (var i = 0; i < hits.length; i++) {
            var partId = hits[i].object.userData.eyePart;
            if (!parts[partId]) continue;
            var score = parts[partId].priority - hits[i].distance * 0.0006;
            if (score > chosenScore) {
                chosen = hits[i];
                chosenScore = score;
            }
        }
        return chosen;
    }

    function clearHover() {
        hoverPartId = null;
        hoverTag.style.display = 'none';
        renderer.domElement.setAttribute('data-hover-part', '');
    }

    function setActivePart(partId) {
        if (!parts[partId]) return;
        activePartId = partId;
        panelTitle.textContent = parts[partId].title;
        panelBody.textContent = parts[partId].body;
        panelMeta.textContent = parts[partId].meta;
        renderer.domElement.setAttribute('data-active-part', activePartId);
        updateChipState();
    }

    function updateChipState() {
        var chips = partDock.querySelectorAll('.part-chip');
        for (var i = 0; i < chips.length; i++) {
            chips[i].classList.toggle('is-active', chips[i].getAttribute('data-part') === activePartId);
        }
    }

    function resetRotation() {
        targetRotationX = isShowcaseMode ? 0 : -0.04;
        targetRotationY = isShowcaseMode ? 0 : -0.22;
    }

    function onResize() {
        width = Math.max(1, window.innerWidth);
        height = Math.max(1, window.innerHeight);
        renderer.setSize(width, height);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
    }

    function animate() {
        requestAnimationFrame(animate);
        var t = (Date.now() - startTime) * 0.001;
        explodeProgress += (explodeTarget - explodeProgress) * 0.075;
        var explodeEase = smoothstep(0, 1, explodeProgress);

        if (!isDragging) {
            if (isShowcaseMode) {
                targetRotationY += (Math.sin(t * 0.34) * 0.16 - targetRotationY) * 0.018;
                targetRotationX += (Math.sin(t * 0.26) * 0.035 - targetRotationX) * 0.018;
            } else {
                targetRotationY += 0.0006;
                targetRotationX += (-0.04 - targetRotationX) * 0.004;
            }
        }

        currentRotationX += (targetRotationX - currentRotationX) * 0.1;
        currentRotationY += (targetRotationY - currentRotationY) * 0.1;
        eyeRoot.rotation.x = currentRotationX + Math.sin(t * 0.32) * 0.01;
        eyeRoot.rotation.y = currentRotationY + Math.sin(t * 0.24) * 0.025;
        eyeRoot.rotation.z = Math.sin(t * 0.18) * 0.01;

        applyLayerState(explodeEase);
        applyFrontEyeState(explodeEase, t);
        applyMaterialState(t, explodeEase);
        applyRevealState(explodeEase);
        renderer.domElement.setAttribute('data-rotation-y', currentRotationY.toFixed(4));
        renderer.domElement.setAttribute('data-explode-progress', explodeProgress.toFixed(3));
        renderer.render(scene, camera);
    }

    function applyLayerState(explodeEase) {
        for (var i = 0; i < partObjects.length; i++) {
            var object = partObjects[i];
            var partId = object.userData.eyePart;
            var offset = layerOffsets[partId];
            if (!offset) continue;
            object.position.set(
                object.userData.basePosition.x + offset.x * explodeEase,
                object.userData.basePosition.y + offset.y * explodeEase,
                object.userData.basePosition.z + offset.z * explodeEase
            );
            object.scale.set(
                object.userData.baseScale.x * (1 + explodeEase * 0.018),
                object.userData.baseScale.y * (1 + explodeEase * 0.018),
                object.userData.baseScale.z * (1 + explodeEase * 0.018)
            );
        }
        for (var j = 0; j < hitAreaObjects.length; j++) {
            var hitArea = hitAreaObjects[j];
            var hitPartId = hitArea.userData.eyePart;
            var hitOffset = layerOffsets[hitPartId];
            if (!hitOffset) continue;
            hitArea.position.set(
                hitArea.userData.basePosition.x + hitOffset.x * explodeEase,
                hitArea.userData.basePosition.y + hitOffset.y * explodeEase,
                hitArea.userData.basePosition.z + hitOffset.z * explodeEase
            );
            hitArea.scale.copy(hitArea.userData.baseScale);
        }
    }

    function applyFrontEyeState(explodeEase, t) {
        if (!frontEyeGroup) return;
        if (isShowcaseMode) {
            frontEyeGroup.visible = true;
            frontEyeGroup.scale.set(1.04 + Math.sin(t * 1.4) * 0.01, 1.02, 1);
            frontEyeGroup.position.set(0, 0, 94);
            for (var showcaseIndex = 0; showcaseIndex < frontEyeObjects.length; showcaseIndex++) {
                var showcaseMaterials = getMaterials(frontEyeObjects[showcaseIndex]);
                for (var showcaseMaterialIndex = 0; showcaseMaterialIndex < showcaseMaterials.length; showcaseMaterialIndex++) {
                    var showcaseMaterial = showcaseMaterials[showcaseMaterialIndex];
                    var showcaseOpacity = showcaseMaterial.userData && showcaseMaterial.userData.frontBaseOpacity !== undefined ?
                        showcaseMaterial.userData.frontBaseOpacity :
                        1;
                    showcaseMaterial.opacity = showcaseOpacity;
                }
            }
            return;
        }
        var visibleAmount = 1 - smoothstep(0.08, 0.82, explodeEase);
        frontEyeGroup.visible = visibleAmount > 0.02;
        frontEyeGroup.scale.set(
            1 + explodeEase * 0.035,
            1 + explodeEase * 0.018,
            1
        );
        frontEyeGroup.position.z = 118 + explodeEase * 26;
        frontEyeGroup.position.x = -18 - explodeEase * 18;

        for (var i = 0; i < frontEyeObjects.length; i++) {
            var materials = getMaterials(frontEyeObjects[i]);
            for (var j = 0; j < materials.length; j++) {
                var material = materials[j];
                var baseOpacity = material.userData && material.userData.frontBaseOpacity !== undefined ?
                    material.userData.frontBaseOpacity :
                    1;
                material.opacity = baseOpacity * (0.08 + visibleAmount * 0.92);
            }
        }
    }

    function applyMaterialState(t, explodeEase) {
        if (isShowcaseMode) {
            setObjectsVisibility(partObjects, false);
            setObjectsVisibility(hitAreaObjects, false);
            setObjectsOpacity(partObjects, 0);
            return;
        }
        var pulse = 0.5 + Math.sin(t * 3.6) * 0.5;
        var layerVisibility = 0.08 + explodeEase * 0.92;
        var touchedMaterials = [];
        for (var i = 0; i < partObjects.length; i++) {
            var object = partObjects[i];
            var material = object.material;
            if (!material || touchedMaterials.indexOf(material) !== -1) continue;
            touchedMaterials.push(material);

            var partId = object.userData.eyePart;
            var isActive = partId === activePartId || partId === hoverPartId;
            if (material.color) material.color.setHex(object.userData.baseColor);
            if (material.emissive) {
                material.emissive.setHex(isActive ? parts[partId].accent : object.userData.baseEmissive);
            }
            if (material.opacity !== undefined) {
                var opacity = isActive ?
                    Math.min(0.96, object.userData.baseOpacity + 0.18 + pulse * 0.08) :
                    object.userData.baseOpacity;
                material.opacity = opacity * layerVisibility;
            }
        }
    }

    function applyRevealState(explodeEase) {
        if (isShowcaseMode) {
            setObjectsVisibility(revealObjects, false);
            setObjectsOpacity(revealObjects, 0);
            return;
        }
        var revealVisibility = 0.08 + explodeEase * 0.92;
        var touchedMaterials = [];
        for (var i = 0; i < revealObjects.length; i++) {
            var material = revealObjects[i].material;
            if (!material || material.opacity === undefined || touchedMaterials.indexOf(material) !== -1) continue;
            touchedMaterials.push(material);
            material.opacity = revealObjects[i].userData.baseOpacity * revealVisibility;
        }
    }

    function getMaterials(object) {
        if (!object.material) return [];
        return Array.isArray(object.material) ? object.material : [object.material];
    }

    function setObjectsOpacity(objects, opacity) {
        var touchedMaterials = [];
        for (var i = 0; i < objects.length; i++) {
            var materials = getMaterials(objects[i]);
            for (var j = 0; j < materials.length; j++) {
                var material = materials[j];
                if (!material || material.opacity === undefined || touchedMaterials.indexOf(material) !== -1) continue;
                touchedMaterials.push(material);
                material.opacity = opacity;
            }
        }
    }

    function setObjectsVisibility(objects, visible) {
        for (var i = 0; i < objects.length; i++) {
            objects[i].visible = visible;
        }
    }

    function smoothstep(edge0, edge1, x) {
        var t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
        return t * t * (3 - 2 * t);
    }
}());
