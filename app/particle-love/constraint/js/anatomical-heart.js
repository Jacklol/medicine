(function () {
    'use strict';

    var THREE = window.THREE;
    var renderer;
    var scene;
    var camera;
    var heartRoot;
    var coreGlow;
    var pulseLight;
    var raycaster;
    var mouse;
    var heartPartObjects = [];
    var heartHitObjects = [];
    var activeHeartPart = 'ventricles';
    var hoverHeartPart = null;
    var width = 1;
    var height = 1;
    var startTime = Date.now();
    var isDragging = false;
    var lastPointerX = 0;
    var lastPointerY = 0;
    var targetRotationX = 0.08;
    var targetRotationY = -0.46;
    var currentRotationX = 0.08;
    var currentRotationY = -0.46;
    var rotationVelocityX = 0;
    var rotationVelocityY = 0;
    var isTransparent = /\btransparent=1\b/.test(window.location.search);
    var isHeroEmbed = /\bhero=1\b/.test(window.location.search);

    var deepRed = 0x360309;
    var wallRed = 0x8d1717;
    var hotRed = 0xff2a24;
    var darkBlue = 0x172541;

    var heartParts = {
        ventricles: {
            title: 'Ventricles',
            chip: 'Ventricles',
            body: 'Lower pumping chambers that drive blood out through the pulmonary artery and aorta.',
            meta: 'Pumping mass',
            accent: 0xff4e3d,
            priority: 10
        },
        atria: {
            title: 'Atria',
            chip: 'Atria',
            body: 'Upper receiving chambers that feed blood into the ventricles before each beat.',
            meta: 'Receiving chambers',
            accent: 0xff9185,
            priority: 8
        },
        aorta: {
            title: 'Aorta',
            chip: 'Aorta',
            body: 'Main systemic artery carrying oxygenated blood from the left ventricle.',
            meta: 'Systemic outflow',
            accent: 0xff7669,
            priority: 9
        },
        pulmonary: {
            title: 'Pulmonary artery',
            chip: 'Pulmonary',
            body: 'Vessel pathway carrying blood from the right ventricle toward the lungs.',
            meta: 'Lung outflow',
            accent: 0x8fa3ff,
            priority: 9
        },
        coronary: {
            title: 'Coronary vessels',
            chip: 'Coronary',
            body: 'Surface vessels that supply the heart muscle itself during the cardiac cycle.',
            meta: 'Heart muscle supply',
            accent: 0xffd18a,
            priority: 13
        }
    };
    var heartPartOrder = ['ventricles', 'atria', 'aorta', 'pulmonary', 'coronary'];
    var heartPartPanel;
    var heartPartBody;
    var heartPartMeta;
    var heartPartDock;
    var heartHoverTag;

    init();
    animate();

    function init() {
        if (isTransparent) {
            document.documentElement.classList.add('is-transparent');
        }
        if (isHeroEmbed) {
            document.documentElement.classList.add('is-hero');
        }
        scene = new THREE.Scene();
        scene.fog = new THREE.FogExp2(0x100f12, isTransparent ? 0.0009 : 0.0016);

        camera = new THREE.PerspectiveCamera(42, 1, 1, 2600);
        camera.position.set(0, isHeroEmbed ? 18 : 34, isHeroEmbed ? 720 : 780);
        camera.lookAt(new THREE.Vector3(0, 18, 0));

        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: isTransparent });
        renderer.setClearColor(0x100f12, isTransparent ? 0 : 1);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        document.body.appendChild(renderer.domElement);

        var ambient = new THREE.AmbientLight(0x4d2020);
        scene.add(ambient);

        var key = new THREE.PointLight(0xff7568, 0.95, 1200);
        key.position.set(-260, 260, 440);
        scene.add(key);

        pulseLight = new THREE.PointLight(0xff2a24, 0.65, 520);
        pulseLight.position.set(0, 14, 130);
        scene.add(pulseLight);

        var rim = new THREE.PointLight(0x5a85ff, 0.28, 900);
        rim.position.set(340, 190, -260);
        scene.add(rim);

        heartRoot = new THREE.Object3D();
        heartRoot.rotation.y = currentRotationY;
        heartRoot.rotation.x = currentRotationX;
        scene.add(heartRoot);

        raycaster = new THREE.Raycaster();
        mouse = new THREE.Vector2();
        bindHeartUi();
        buildHeart();
        addHeartHitAreas();
        buildHeartDock();
        addInteraction();
        if (isHeroEmbed) {
            window.addEventListener('message', onHostMessage);
        }
        setHeartPart(activeHeartPart);
        renderer.domElement.setAttribute('data-controls', 'ready');
        window.addEventListener('resize', onResize);
        onResize();
    }

    function buildHeart() {
        var wallMaterial = new THREE.MeshPhongMaterial({
            color: wallRed,
            emissive: deepRed,
            specular: 0x45100f,
            shininess: 8,
            transparent: true,
            opacity: isHeroEmbed ? 0.78 : 0.6,
            side: THREE.DoubleSide
        });

        var ventricularMass = createVentricularMass({
            rows: 58,
            cols: 78
        });
        var rightAtrium = createLobe({
            center: new THREE.Vector3(78, 72, 12),
            scale: new THREE.Vector3(68, 62, 54),
            rotationZ: 0.18,
            rows: 26,
            cols: 44,
            taper: 0.78,
            lean: -0.08
        });
        var leftAtrium = createLobe({
            center: new THREE.Vector3(-66, 78, -6),
            scale: new THREE.Vector3(66, 58, 50),
            rotationZ: -0.2,
            rows: 26,
            cols: 44,
            taper: 0.82,
            lean: 0.08
        });
        var rightAuricle = createLobe({
            center: new THREE.Vector3(112, 42, 54),
            scale: new THREE.Vector3(38, 34, 28),
            rotationZ: -0.52,
            rows: 20,
            cols: 34,
            taper: 0.62,
            lean: -0.12
        });
        var leftAuricle = createLobe({
            center: new THREE.Vector3(-116, 48, 48),
            scale: new THREE.Vector3(42, 36, 30),
            rotationZ: 0.58,
            rows: 20,
            cols: 34,
            taper: 0.58,
            lean: 0.12
        });

        [
            { model: ventricularMass, atrium: false, opacity: isHeroEmbed ? 0.88 : 0.72, part: 'ventricles' },
            { model: leftAtrium, atrium: true, opacity: isHeroEmbed ? 0.62 : 0.46, part: 'atria' },
            { model: rightAtrium, atrium: true, opacity: isHeroEmbed ? 0.64 : 0.48, part: 'atria' },
            { model: leftAuricle, atrium: true, opacity: isHeroEmbed ? 0.64 : 0.5, part: 'atria' },
            { model: rightAuricle, atrium: true, opacity: isHeroEmbed ? 0.64 : 0.5, part: 'atria' }
        ].forEach(function (partInfo) {
            var part = partInfo.model;
            var mesh = new THREE.Mesh(part.geometry, wallMaterial.clone());
            mesh.material.opacity = partInfo.opacity;
            heartRoot.add(mesh);
            registerHeartVisual(mesh, partInfo.part);
            if (partInfo.surface !== false) {
                addSurfaceNetwork(part.points, part.cols, part.rows, partInfo.atrium, partInfo.part);
            }
        });

        coreGlow = new THREE.Mesh(
            new THREE.SphereGeometry(86, 28, 20),
            new THREE.MeshBasicMaterial({
                color: 0xff1c16,
                transparent: true,
                opacity: 0.08,
                blending: THREE.AdditiveBlending,
                depthWrite: false
            })
        );
        coreGlow.position.set(4, -18, 28);
        coreGlow.scale.set(1.05, 1.25, 0.76);
        heartRoot.add(coreGlow);

        addSeptumGroove();
        addVessels();
        addCoronaryLines();
        addMuscleFibers();
    }

    function createLobe(options) {
        var rows = options.rows;
        var cols = options.cols;
        var vertices = [];
        var faces = [];
        var surfacePoints = [];
        var rot = options.rotationZ || 0;
        var cosR = Math.cos(rot);
        var sinR = Math.sin(rot);

        for (var row = 0; row <= rows; row++) {
            var v = row / rows;
            var theta = v * Math.PI;
            var yNorm = Math.cos(theta);
            var ring = Math.sin(theta);
            var pear = options.taper + (1 - options.taper) * smoothstep(-0.95, 0.55, yNorm);
            var topBulge = 1 + 0.16 * smoothstep(0.1, 1, yNorm);
            for (var col = 0; col < cols; col++) {
                var u = col / cols;
                var phi = u * Math.PI * 2;
                var asymmetry = 1 + 0.08 * Math.sin(phi * 2.0 + row * 0.25) + 0.05 * Math.cos(phi - yNorm);
                var x = Math.cos(phi) * ring * options.scale.x * pear * asymmetry * topBulge;
                var y = yNorm * options.scale.y;
                var z = Math.sin(phi) * ring * options.scale.z * pear * (1 + 0.1 * Math.cos(phi + 0.8));

                y -= Math.pow(Math.max(0, -yNorm), 2.1) * options.scale.y * 0.18;
                x += options.lean * (1 - yNorm) * options.scale.x * 0.28;

                var rx = x * cosR - y * sinR;
                var ry = x * sinR + y * cosR;
                var bottomBlend = Math.pow(Math.max(0, -yNorm), 2.35);
                var centerX = options.center.x + ((options.apexX === undefined ? options.center.x : options.apexX) - options.center.x) * bottomBlend;
                var centerZ = options.center.z + ((options.apexZ === undefined ? options.center.z : options.apexZ) - options.center.z) * bottomBlend;
                var p = new THREE.Vector3(
                    rx + centerX,
                    ry + options.center.y,
                    z + centerZ
                );
                vertices.push(p);
                surfacePoints.push(p);
            }
        }

        for (var r = 0; r < rows; r++) {
            for (var c = 0; c < cols; c++) {
                var a = r * cols + c;
                var b = r * cols + (c + 1) % cols;
                var d = (r + 1) * cols + c;
                var e = (r + 1) * cols + (c + 1) % cols;
                faces.push(new THREE.Face3(a, d, b));
                faces.push(new THREE.Face3(b, d, e));
            }
        }

        var topCapIndex = vertices.length;
        vertices.push(new THREE.Vector3(-16, 52, 24));
        for (var topCol = 0; topCol < cols; topCol++) {
            faces.push(new THREE.Face3(topCapIndex, topCol, (topCol + 1) % cols));
        }

        var bottomStart = rows * cols;
        var bottomCapIndex = vertices.length;
        vertices.push(new THREE.Vector3(42, -202, 52));
        for (var bottomCol = 0; bottomCol < cols; bottomCol++) {
            faces.push(new THREE.Face3(bottomCapIndex, bottomStart + ((bottomCol + 1) % cols), bottomStart + bottomCol));
        }

        var geometry = new THREE.Geometry();
        geometry.vertices = vertices;
        geometry.faces = faces;
        geometry.computeFaceNormals();
        geometry.computeVertexNormals();

        return {
            geometry: geometry,
            points: surfacePoints,
            cols: cols,
            rows: rows + 1
        };
    }

    function createVentricularMass(options) {
        var rows = options.rows;
        var cols = options.cols;
        var vertices = [];
        var faces = [];
        var surfacePoints = [];

        for (var row = 0; row <= rows; row++) {
            var t = row / rows;
            var taper = 0.2 + 0.8 * Math.pow(1 - smoothstep(0.12, 1, t), 0.54);
            var shoulder = 1 + 0.2 * Math.exp(-Math.pow((t - 0.18) / 0.18, 2));
            var lowerRound = 1 + 0.28 * Math.exp(-Math.pow((t - 0.62) / 0.24, 2));
            var upperOpen = 0.5 + 0.5 * smoothstep(0, 0.2, t);
            var width = 14 + 100 * taper * shoulder * lowerRound * upperOpen;
            var upperDepth = 0.68 + 0.32 * smoothstep(0, 0.18, t);
            var depth = 12 + 58 * (0.22 + 0.78 * Math.pow(1 - smoothstep(0.16, 1, t), 0.68)) * upperDepth;
            var centerX = -18 + 42 * smoothstep(0.18, 1, t);
            var centerY = 62 - 222 * t + 8 * Math.exp(-Math.pow((t - 0.24) / 0.18, 2));
            var centerZ = 12 + 34 * smoothstep(0.25, 1, t);

            for (var col = 0; col < cols; col++) {
                var u = col / cols;
                var phi = u * Math.PI * 2;
                var cosPhi = Math.cos(phi);
                var sinPhi = Math.sin(phi);
                var front = Math.max(0, sinPhi);
                var back = Math.max(0, -sinPhi);
                var rightSide = Math.max(0, cosPhi);
                var leftSide = Math.max(0, -cosPhi);

                var sideScale = 1 + 0.28 * rightSide * smoothstep(0.12, 0.78, t) - 0.12 * leftSide * smoothstep(0.34, 0.9, t);
                var frontScale = 1 + 0.16 * front * (1 - smoothstep(0.78, 1, t)) - 0.1 * back;
                var x = cosPhi * width * sideScale;
                var y = centerY;
                var z = sinPhi * depth * frontScale;

                var topNotch = Math.exp(-Math.pow((t - 0.02) / 0.16, 2)) * front;
                y -= topNotch * (16 + 18 * smoothstep(0.15, 0.95, Math.abs(cosPhi)));
                y += (1 - smoothstep(0, 0.16, t)) * (8 * rightSide - 6 * leftSide);

                var grooveCenter = 20 - 30 * t;
                var groove = Math.exp(-Math.pow((x - grooveCenter) / 16, 2)) * front * smoothstep(0.12, 0.86, t);
                z -= groove * 14;
                x -= groove * 4;

                var organic = 1 + 0.04 * Math.sin(phi * 3.0 + t * 8.0) + 0.035 * Math.cos(phi * 5.0 - t * 6.0);
                x *= organic;
                z *= organic;

                if (t > 0.78) {
                    var apexBlend = smoothstep(0.78, 1, t);
                    x *= 1 - apexBlend * 0.32;
                    z *= 1 - apexBlend * 0.28;
                    y -= apexBlend * 4;
                    x += apexBlend * 16;
                    z += apexBlend * 4;
                }

                var p = new THREE.Vector3(
                    x + centerX,
                    y,
                    z + centerZ
                );
                vertices.push(p);
                surfacePoints.push(p);
            }
        }

        for (var r = 0; r < rows; r++) {
            for (var c = 0; c < cols; c++) {
                var a = r * cols + c;
                var b = r * cols + (c + 1) % cols;
                var d = (r + 1) * cols + c;
                var e = (r + 1) * cols + (c + 1) % cols;
                faces.push(new THREE.Face3(a, d, b));
                faces.push(new THREE.Face3(b, d, e));
            }
        }

        var massTopCapIndex = vertices.length;
        vertices.push(new THREE.Vector3(-18, 54, 24));
        for (var massTopCol = 0; massTopCol < cols; massTopCol++) {
            faces.push(new THREE.Face3(massTopCapIndex, massTopCol, (massTopCol + 1) % cols));
        }

        var massBottomStart = rows * cols;
        var massBottomCapIndex = vertices.length;
        vertices.push(new THREE.Vector3(42, -164, 54));
        for (var massBottomCol = 0; massBottomCol < cols; massBottomCol++) {
            faces.push(new THREE.Face3(massBottomCapIndex, massBottomStart + ((massBottomCol + 1) % cols), massBottomStart + massBottomCol));
        }

        var geometry = new THREE.Geometry();
        geometry.vertices = vertices;
        geometry.faces = faces;
        geometry.computeFaceNormals();
        geometry.computeVertexNormals();

        return {
            geometry: geometry,
            points: surfacePoints,
            cols: cols,
            rows: rows + 1
        };
    }

    function addSurfaceNetwork(points, cols, rows, isAtrium, partId) {
        var particlePoints = [];
        var density = isAtrium ? 0.48 : 0.38;
        for (var pointRow = 1; pointRow < rows - 1; pointRow++) {
            for (var pointCol = 0; pointCol < cols; pointCol++) {
                if (hash2(pointRow, pointCol) < density) {
                    var surfacePoint = points[pointRow * cols + pointCol].clone();
                    var jitter = isAtrium ? 1.2 : 1.6;
                    surfacePoint.x += (hash2(pointCol, pointRow + 31) - 0.5) * jitter;
                    surfacePoint.y += (hash2(pointRow + 19, pointCol) - 0.5) * jitter;
                    surfacePoint.z += (hash2(pointCol + 7, pointRow + 11) - 0.5) * jitter;
                    particlePoints.push(surfacePoint);
                }
            }
        }

        var particlePositions = new Float32Array(particlePoints.length * 3);
        for (var i = 0; i < particlePoints.length; i++) {
            particlePositions[i * 3] = particlePoints[i].x;
            particlePositions[i * 3 + 1] = particlePoints[i].y;
            particlePositions[i * 3 + 2] = particlePoints[i].z;
        }

        var pointGeometry = new THREE.BufferGeometry();
        pointGeometry.addAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
        var surfacePointsObject = new THREE.Points(pointGeometry, new THREE.PointsMaterial({
            color: isAtrium ? 0xff4b42 : 0xdc1616,
            size: isAtrium ? 2.1 : 1.8,
            transparent: true,
            opacity: isAtrium ? 0.56 : 0.68,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        }));
        heartRoot.add(surfacePointsObject);
        registerHeartVisual(surfacePointsObject, partId);

        var lineList = [];
        for (var row = 1; row < rows - 1; row++) {
            for (var col = 0; col < cols; col++) {
                var idx = row * cols + col;
                if (row % 2 === 0 && hash2(row, col) < 0.34) pushSegment(lineList, points[idx], points[(row + 1) * cols + col]);
                if (hash2(row + 17, col + 5) < 0.11) pushSegment(lineList, points[idx], points[(row + 1) * cols + ((col + 2) % cols)]);
            }
        }

        var surfaceLineObject = new THREE.LineSegments(makeLineGeometry(lineList), new THREE.LineBasicMaterial({
            color: isAtrium ? 0xa62b24 : 0x9c1012,
            transparent: true,
            opacity: isAtrium ? 0.22 : 0.28,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        }));
        heartRoot.add(surfaceLineObject);
        registerHeartVisual(surfaceLineObject, partId);
    }

    function addSeptumGroove() {
        var lineList = [];
        for (var i = 0; i < 56; i++) {
            var t0 = i / 56;
            var t1 = (i + 1) / 56;
            pushSegment(lineList, septumPoint(t0), septumPoint(t1));
        }
        heartRoot.add(new THREE.LineSegments(makeLineGeometry(lineList), new THREE.LineBasicMaterial({
            color: 0x140000,
            transparent: true,
            opacity: 0.7
        })));
    }

    function septumPoint(t) {
        var y = 76 - t * 220;
        var x = Math.sin(t * Math.PI * 1.1) * 16;
        var z = 52 + Math.cos(t * Math.PI) * 10;
        return new THREE.Vector3(x, y, z);
    }

    function addVessels() {
        addTube('aorta', [
            new THREE.Vector3(-18, 108, -34),
            new THREE.Vector3(-24, 170, -54),
            new THREE.Vector3(38, 224, -44),
            new THREE.Vector3(104, 184, -18)
        ], 23, 0xe55a4f, 0.7, {
            segments: 52,
            sides: 16,
            meshOpacity: 0.44,
            pointSize: 1.8,
            specular: 0xff8f78
        });
        addTube('aortaBranchA', [
            new THREE.Vector3(18, 214, -46),
            new THREE.Vector3(6, 236, -48),
            new THREE.Vector3(4, 258, -42)
        ], 8, 0xe55a4f, 0.58, { segments: 28, sides: 10, meshOpacity: 0.34, pointSize: 1.4 });
        addTube('aortaBranchB', [
            new THREE.Vector3(48, 214, -38),
            new THREE.Vector3(58, 238, -34),
            new THREE.Vector3(62, 264, -26)
        ], 8, 0xe55a4f, 0.58, { segments: 28, sides: 10, meshOpacity: 0.34, pointSize: 1.4 });
        addTube('aortaBranchC', [
            new THREE.Vector3(78, 198, -28),
            new THREE.Vector3(104, 222, -20),
            new THREE.Vector3(132, 244, -12)
        ], 7, 0xe55a4f, 0.52, { segments: 28, sides: 9, meshOpacity: 0.3, pointSize: 1.3 });
        addTube('descendingAorta', [
            new THREE.Vector3(104, 184, -18),
            new THREE.Vector3(126, 130, -20),
            new THREE.Vector3(126, 74, -24),
            new THREE.Vector3(118, 18, -28)
        ], 17, 0xae302b, 0.42, { segments: 38, sides: 13, meshOpacity: 0.25, pointSize: 1.4 });
        addTube('pulmonaryTrunk', [
            new THREE.Vector3(8, 126, 58),
            new THREE.Vector3(-10, 158, 88),
            new THREE.Vector3(-72, 164, 82),
            new THREE.Vector3(-140, 146, 58)
        ], 14, 0x6f7891, 0.48, {
            segments: 48,
            sides: 13,
            meshOpacity: 0.28,
            pointSize: 1.25,
            pointDensity: 0.18,
            emissive: 0x101828,
            specular: 0xd9d5d0
        });
        addTube('pulmonaryRightBranch', [
            new THREE.Vector3(-8, 150, 72),
            new THREE.Vector3(32, 164, 96),
            new THREE.Vector3(82, 154, 92),
            new THREE.Vector3(122, 134, 74)
        ], 8, 0x6f7891, 0.4, { segments: 34, sides: 9, meshOpacity: 0.22, pointSize: 1.1, pointDensity: 0.18, emissive: 0x101828 });
        addTube('venaTop', [
            new THREE.Vector3(78, 110, 14),
            new THREE.Vector3(88, 166, 16),
            new THREE.Vector3(84, 224, 18),
            new THREE.Vector3(76, 258, 18)
        ], 17, 0x4d506a, 0.56, { segments: 44, sides: 14, meshOpacity: 0.34, pointSize: 1.5, emissive: 0x0b1022, specular: 0x9aa1b8 });
        addTube('venaBottom', [
            new THREE.Vector3(76, 66, 12),
            new THREE.Vector3(94, 2, 18),
            new THREE.Vector3(98, -72, 24)
        ], 14, 0x3f435f, 0.46, { segments: 34, sides: 12, meshOpacity: 0.28, pointSize: 1.4, emissive: 0x0b1022 });
        addTube('pulmonaryVeinsLeft', [
            new THREE.Vector3(-96, 94, -8),
            new THREE.Vector3(-142, 104, -4),
            new THREE.Vector3(-182, 96, 2)
        ], 10, 0xba6a62, 0.5, { segments: 30, sides: 10, meshOpacity: 0.3, pointSize: 1.3, specular: 0xffb3a2 });
        addTube('pulmonaryVeinsRight', [
            new THREE.Vector3(-44, 106, -28),
            new THREE.Vector3(6, 128, -60),
            new THREE.Vector3(48, 126, -88)
        ], 9, 0xba6a62, 0.45, { segments: 30, sides: 10, meshOpacity: 0.28, pointSize: 1.3, specular: 0xffb3a2 });
        addTube('pulmonaryVeinsLeftLower', [
            new THREE.Vector3(-102, 70, -2),
            new THREE.Vector3(-150, 70, 10),
            new THREE.Vector3(-188, 58, 18)
        ], 8, 0xb84d4a, 0.42, { segments: 26, sides: 9, meshOpacity: 0.24, pointSize: 1.2 });
        addTube('pulmonaryVeinsRightLower', [
            new THREE.Vector3(-34, 84, -36),
            new THREE.Vector3(12, 94, -72),
            new THREE.Vector3(58, 84, -100)
        ], 8, 0xb84d4a, 0.42, { segments: 26, sides: 9, meshOpacity: 0.24, pointSize: 1.2 });
    }

    function addEpicardialFat() {
        addTube('atrioventricularFatLeft', [
            new THREE.Vector3(-108, 44, 62),
            new THREE.Vector3(-72, 60, 82),
            new THREE.Vector3(-22, 58, 84),
            new THREE.Vector3(24, 48, 78)
        ], 4.5, 0xc88945, 0.32, {
            segments: 44,
            sides: 8,
            meshOpacity: 0.18,
            pointSize: 1.0,
            emissive: 0x241204,
            specular: 0x6c3b1a,
            pulse: false
        });
        addTube('atrioventricularFatRight', [
            new THREE.Vector3(22, 48, 78),
            new THREE.Vector3(62, 48, 76),
            new THREE.Vector3(100, 36, 62),
            new THREE.Vector3(126, 16, 42)
        ], 4, 0xb8743e, 0.28, {
            segments: 40,
            sides: 8,
            meshOpacity: 0.16,
            pointSize: 0.95,
            emissive: 0x241204,
            specular: 0x6c3b1a,
            pulse: false
        });
        addFiber([
            new THREE.Vector3(-122, 62, 50),
            new THREE.Vector3(-114, 50, 68),
            new THREE.Vector3(-96, 36, 72),
            new THREE.Vector3(-76, 28, 62)
        ], 0x4a0808, 0.36);
        addFiber([
            new THREE.Vector3(116, 58, 54),
            new THREE.Vector3(104, 42, 72),
            new THREE.Vector3(86, 28, 76),
            new THREE.Vector3(64, 18, 64)
        ], 0x4a0808, 0.36);
    }

    function addTube(name, controlPoints, radius, color, opacity, options) {
        options = options || {};
        var points = [];
        var displayPoints = [];
        var vertices = [];
        var faces = [];
        var lines = [];
        var segments = options.segments || 34;
        var sides = options.sides || 12;
        var previousRing = null;
        var previousRingIndices = null;

        for (var i = 0; i <= segments; i++) {
            var t = i / segments;
            var center = sampleCurve(controlPoints, t);
            var tangent = sampleCurve(controlPoints, Math.min(1, t + 0.015)).sub(sampleCurve(controlPoints, Math.max(0, t - 0.015))).normalize();
            var up = Math.abs(tangent.y) > 0.82 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
            var side = new THREE.Vector3().crossVectors(tangent, up).normalize();
            var normal = new THREE.Vector3().crossVectors(side, tangent).normalize();
            var ring = [];
            var ringIndices = [];

            for (var j = 0; j < sides; j++) {
                var angle = Math.PI * 2 * j / sides;
                var pulseBias = 1 + (options.pulse === false ? 0 : 0.08 * Math.sin(t * Math.PI * 2 + j * 0.8));
                var p = center.clone()
                    .add(side.clone().multiplyScalar(Math.cos(angle) * radius * pulseBias))
                    .add(normal.clone().multiplyScalar(Math.sin(angle) * radius * pulseBias));
                points.push(p);
                if (options.pointDensity !== 0 && hash2(i + 3, j + 13) < (options.pointDensity || 0.32)) {
                    displayPoints.push(p);
                }
                vertices.push(p);
                ring.push(p);
                ringIndices.push(vertices.length - 1);
            }
            if (previousRing) {
                for (var k = 0; k < sides; k++) {
                    var next = (k + 1) % sides;
                    faces.push(new THREE.Face3(previousRingIndices[k], ringIndices[k], previousRingIndices[next]));
                    faces.push(new THREE.Face3(previousRingIndices[next], ringIndices[k], ringIndices[next]));
                    if (k % 2 === 0) pushSegment(lines, previousRing[k], ring[k]);
                }
            }
            previousRing = ring;
            previousRingIndices = ringIndices;
        }

        var tubeGeometry = new THREE.Geometry();
        tubeGeometry.vertices = vertices;
        tubeGeometry.faces = faces;
        tubeGeometry.computeFaceNormals();
        tubeGeometry.computeVertexNormals();
        var meshMaterial = new THREE.MeshPhongMaterial({
            color: color,
            emissive: options.emissive || 0x150204,
            specular: options.specular || 0x9b4842,
            shininess: options.shininess || 18,
            transparent: true,
            opacity: options.meshOpacity === undefined ? Math.min(0.42, opacity * 0.58) : options.meshOpacity,
            depthWrite: false,
            side: THREE.DoubleSide
        });
        var tubeMesh = new THREE.Mesh(tubeGeometry, meshMaterial);
        heartRoot.add(tubeMesh);
        registerHeartVisual(tubeMesh, mapTubeToHeartPart(name));

        var pointPositions = new Float32Array(displayPoints.length * 3);
        for (var n = 0; n < displayPoints.length; n++) {
            pointPositions[n * 3] = displayPoints[n].x;
            pointPositions[n * 3 + 1] = displayPoints[n].y;
            pointPositions[n * 3 + 2] = displayPoints[n].z;
        }
        var pointGeometry = new THREE.BufferGeometry();
        pointGeometry.addAttribute('position', new THREE.BufferAttribute(pointPositions, 3));
        var pointsObject = new THREE.Points(pointGeometry, new THREE.PointsMaterial({
            color: color,
            size: options.pointSize || 2.35,
            transparent: true,
            opacity: opacity,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        }));
        heartRoot.add(pointsObject);
        registerHeartVisual(pointsObject, mapTubeToHeartPart(name));

        var lineObject = new THREE.LineSegments(makeLineGeometry(lines), new THREE.LineBasicMaterial({
            color: color,
            transparent: true,
            opacity: opacity * 0.36,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        }));
        heartRoot.add(lineObject);
        registerHeartVisual(lineObject, mapTubeToHeartPart(name));
    }

    function sampleCurve(points, t) {
        if (points.length === 4) {
            var a = points[0].clone().multiplyScalar(Math.pow(1 - t, 3));
            var b = points[1].clone().multiplyScalar(3 * Math.pow(1 - t, 2) * t);
            var c = points[2].clone().multiplyScalar(3 * (1 - t) * t * t);
            var d = points[3].clone().multiplyScalar(t * t * t);
            return a.add(b).add(c).add(d);
        }
        var scaled = t * (points.length - 1);
        var index = Math.min(points.length - 2, Math.floor(scaled));
        var local = scaled - index;
        return points[index].clone().lerp(points[index + 1], local);
    }

    function pushSegment(list, a, b) {
        list.push(a.x, a.y, a.z, b.x, b.y, b.z);
    }

    function makeLineGeometry(list) {
        var geometry = new THREE.BufferGeometry();
        geometry.addAttribute('position', new THREE.BufferAttribute(new Float32Array(list), 3));
        return geometry;
    }

    function hash2(a, b) {
        var value = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
        return value - Math.floor(value);
    }

    function smoothstep(edge0, edge1, x) {
        var t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
        return t * t * (3 - 2 * t);
    }

    function bindHeartUi() {
        heartPartPanel = document.querySelector('.heart-part-title');
        heartPartBody = document.querySelector('.heart-part-body');
        heartPartMeta = document.querySelector('.heart-part-meta');
        heartPartDock = document.querySelector('.heart-part-dock');
        heartHoverTag = document.querySelector('.heart-hover-tag');
    }

    function buildHeartDock() {
        if (isHeroEmbed || !heartPartDock) return;
        heartPartDock.innerHTML = '';
        heartPartOrder.forEach(function (partId) {
            var part = heartParts[partId];
            var chip = document.createElement('button');
            chip.className = 'heart-chip';
            chip.type = 'button';
            chip.dataset.part = partId;
            chip.textContent = part.chip;
            chip.addEventListener('mouseenter', function () {
                setHeartPart(partId);
            });
            chip.addEventListener('focus', function () {
                setHeartPart(partId);
            });
            chip.addEventListener('click', function () {
                setHeartPart(partId);
            });
            heartPartDock.appendChild(chip);
        });
    }

    function setHeartPart(partId) {
        var part = heartParts[partId];
        if (!part) return;
        activeHeartPart = partId;
        document.documentElement.setAttribute('data-active-heart-part', partId);
        if (heartPartPanel) heartPartPanel.textContent = part.title;
        if (heartPartBody) heartPartBody.textContent = part.body;
        if (heartPartMeta) heartPartMeta.textContent = part.meta;
        if (!heartPartDock) return;
        var chips = heartPartDock.querySelectorAll('.heart-chip');
        for (var i = 0; i < chips.length; i++) {
            chips[i].classList.toggle('is-active', chips[i].dataset.part === partId);
        }
    }

    function mapTubeToHeartPart(name) {
        if (/^(aorta|aortaBranch|descendingAorta)/.test(name)) return 'aorta';
        if (/^(pulmonaryTrunk|pulmonaryRightBranch)/.test(name)) return 'pulmonary';
        if (name === 'coronary') return 'coronary';
        return null;
    }

    function registerHeartVisual(object, partId) {
        if (!object || !heartParts[partId]) return;
        var material = object.material;
        object.userData.heartPart = partId;
        object.userData.baseOpacity = material && material.opacity !== undefined ? material.opacity : 1;
        object.userData.baseColor = material && material.color ? material.color.getHex() : 0xffffff;
        object.userData.baseEmissive = material && material.emissive ? material.emissive.getHex() : 0;
        object.userData.baseSize = material && material.size !== undefined ? material.size : null;
        heartPartObjects.push(object);
    }

    function addHeartHitAreas() {
        if (isHeroEmbed) return;
        addHeartHitArea('ventricles', 86, new THREE.Vector3(1.22, 1.45, 0.72), new THREE.Vector3(12, -54, 58));
        addHeartHitArea('atria', 66, new THREE.Vector3(1.95, 0.92, 0.72), new THREE.Vector3(4, 70, 42));
        addHeartHitArea('aorta', 58, new THREE.Vector3(1.15, 1.35, 0.72), new THREE.Vector3(38, 188, -34));
        addHeartHitArea('pulmonary', 56, new THREE.Vector3(1.9, 0.62, 0.58), new THREE.Vector3(-44, 156, 78));
        addHeartHitArea('coronary', 30, new THREE.Vector3(1.45, 0.82, 0.46), new THREE.Vector3(6, 22, 102));
        addHeartHitArea('coronary', 28, new THREE.Vector3(1.15, 1.05, 0.46), new THREE.Vector3(62, -36, 86));
        addHeartHitArea('coronary', 26, new THREE.Vector3(1.18, 1.05, 0.46), new THREE.Vector3(-42, -30, 92));
        addHeartHitArea('coronary', 24, new THREE.Vector3(0.9, 1.45, 0.46), new THREE.Vector3(8, -102, 66));
    }

    function addHeartHitArea(partId, radius, scale, position) {
        var hit = new THREE.Mesh(
            new THREE.SphereGeometry(radius, 20, 14),
            new THREE.MeshBasicMaterial({
                color: 0xffffff,
                transparent: true,
                opacity: 0,
                depthWrite: false,
                side: THREE.DoubleSide
            })
        );
        hit.position.copy(position);
        hit.scale.copy(scale);
        hit.userData.heartPart = partId;
        hit.renderOrder = -10;
        heartRoot.add(hit);
        heartHitObjects.push(hit);
    }

    function updateHeartHover(clientX, clientY, persist) {
        if (isHeroEmbed || !raycaster || !heartHitObjects.length) return;
        var rect = renderer.domElement.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);

        var hit = chooseHeartHit(raycaster.intersectObjects(heartHitObjects, false));
        if (!hit) {
            if (!persist) clearHeartHover();
            return;
        }

        var partId = hit.object.userData.heartPart;
        hoverHeartPart = partId;
        document.documentElement.setAttribute('data-hover-heart-part', partId);
        setHeartPart(partId);
        if (heartHoverTag) {
            heartHoverTag.textContent = heartParts[partId].title;
            heartHoverTag.style.left = (clientX - rect.left) + 'px';
            heartHoverTag.style.top = (clientY - rect.top) + 'px';
            heartHoverTag.style.display = 'block';
        }
    }

    function chooseHeartHit(hits) {
        if (!hits.length) return null;
        var selected = hits[0];
        var selectedScore = hitScore(selected);
        for (var i = 1; i < hits.length; i++) {
            var score = hitScore(hits[i]);
            if (score > selectedScore) {
                selected = hits[i];
                selectedScore = score;
            }
        }
        return selected;
    }

    function hitScore(hit) {
        var part = heartParts[hit.object.userData.heartPart];
        return (part ? part.priority : 0) - hit.distance * 0.0005;
    }

    function clearHeartHover() {
        hoverHeartPart = null;
        document.documentElement.setAttribute('data-hover-heart-part', '');
        if (heartHoverTag) heartHoverTag.style.display = 'none';
    }

    function applyHeartPartState(t) {
        if (isHeroEmbed) return;
        var pulse = 0.5 + Math.sin(t * 4.8) * 0.5;
        for (var i = 0; i < heartPartObjects.length; i++) {
            var object = heartPartObjects[i];
            var partId = object.userData.heartPart;
            var part = heartParts[partId];
            var material = object.material;
            if (!part || !material) continue;

            var isSelected = partId === activeHeartPart;
            var isHovered = partId === hoverHeartPart;
            var emphasis = isSelected ? 1 : (isHovered ? 0.7 : 0);
            if (material.emissive) {
                material.color.setHex(object.userData.baseColor);
                material.emissive.setHex(emphasis ? part.accent : object.userData.baseEmissive);
            } else if (material.color) {
                material.color.setHex(emphasis ? part.accent : object.userData.baseColor);
            }
            if (material.opacity !== undefined) {
                material.opacity = emphasis
                    ? Math.min(1, object.userData.baseOpacity + 0.18 * emphasis + pulse * 0.08)
                    : object.userData.baseOpacity;
            }
            if (material.size !== undefined && object.userData.baseSize !== null) {
                material.size = object.userData.baseSize * (emphasis ? 1.18 + pulse * 0.08 : 1);
            }
        }
    }

    function onResize() {
        width = Math.max(1, window.innerWidth);
        height = Math.max(1, window.innerHeight);
        renderer.setSize(width, height);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
    }

    function addInteraction() {
        var canvas = renderer.domElement;
        if (window.PointerEvent) {
            canvas.addEventListener('pointerdown', onPointerDown);
            window.addEventListener('pointermove', onPointerMove);
            window.addEventListener('pointerup', onPointerUp);
            window.addEventListener('pointercancel', onPointerUp);
        } else {
            canvas.addEventListener('mousedown', onPointerDown);
            window.addEventListener('mousemove', onPointerMove);
            window.addEventListener('mouseup', onPointerUp);
            canvas.addEventListener('touchstart', onPointerDown, { passive: false });
            window.addEventListener('touchmove', onPointerMove, { passive: false });
            window.addEventListener('touchend', onPointerUp);
            window.addEventListener('touchcancel', onPointerUp);
        }
        canvas.addEventListener('dblclick', resetRotation);
        if (!isHeroEmbed) {
            canvas.addEventListener('mouseleave', clearHeartHover);
        }
    }

    function onPointerDown(event) {
        var pointer = getPointer(event);
        if (!pointer) return;
        updateHeartHover(pointer.x, pointer.y, true);
        isDragging = true;
        lastPointerX = pointer.x;
        lastPointerY = pointer.y;
        rotationVelocityX = 0;
        rotationVelocityY = 0;
        if (event.pointerId !== undefined && renderer.domElement.setPointerCapture) {
            renderer.domElement.setPointerCapture(event.pointerId);
        }
        renderer.domElement.classList.add('is-grabbing');
        if (event.preventDefault) event.preventDefault();
    }

    function onPointerMove(event) {
        var pointer = getPointer(event);
        if (!pointer) return;
        if (!isDragging) {
            updateHeartHover(pointer.x, pointer.y, false);
            return;
        }
        var dx = pointer.x - lastPointerX;
        var dy = pointer.y - lastPointerY;
        lastPointerX = pointer.x;
        lastPointerY = pointer.y;

        targetRotationY += dx * 0.006;
        targetRotationX += dy * 0.004;
        targetRotationX = Math.max(-0.72, Math.min(0.62, targetRotationX));
        rotationVelocityY = dx * 0.00065;
        rotationVelocityX = dy * 0.00038;
        if (event.preventDefault) event.preventDefault();
    }

    function onHostMessage(event) {
        var data = event.data || {};
        if (data.type === 'hemaflow-heart-reset') {
            resetRotation();
            return;
        }
        if (data.type !== 'hemaflow-heart-drag') return;

        var dx = Number(data.dx) || 0;
        var dy = Number(data.dy) || 0;
        targetRotationY += dx * 0.006;
        targetRotationX += dy * 0.004;
        targetRotationX = Math.max(-0.72, Math.min(0.62, targetRotationX));
        rotationVelocityY = dx * 0.00065;
        rotationVelocityX = dy * 0.00038;
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

    function resetRotation() {
        targetRotationX = 0.08;
        targetRotationY = -0.46;
        rotationVelocityX = 0;
        rotationVelocityY = 0;
    }

    function animate() {
        requestAnimationFrame(animate);
        var t = (Date.now() - startTime) * 0.001;
        var primary = Math.pow(Math.max(0, Math.sin(t * 3.05)), 10);
        var secondary = Math.pow(Math.max(0, Math.sin(t * 3.05 - 0.64)), 16) * 0.48;
        var beat = primary + secondary;
        var expansion = 1 + beat * 0.055;

        if (!isDragging) {
            targetRotationY += 0.0012 + rotationVelocityY;
            targetRotationX += rotationVelocityX;
            targetRotationX += (0.08 - targetRotationX) * 0.006;
            rotationVelocityX *= 0.92;
            rotationVelocityY *= 0.92;
        }
        currentRotationX += (targetRotationX - currentRotationX) * 0.11;
        currentRotationY += (targetRotationY - currentRotationY) * 0.11;

        heartRoot.scale.set(1 + beat * 0.034, expansion, 1 + beat * 0.052);
        heartRoot.rotation.x = currentRotationX + Math.sin(t * 0.24) * 0.012;
        heartRoot.rotation.y = currentRotationY + Math.sin(t * 0.42) * 0.035;
        heartRoot.rotation.z = Math.sin(t * 0.32) * 0.018;

        if (coreGlow) {
            coreGlow.material.opacity = 0.075 + beat * 0.08;
            coreGlow.scale.set(1.05 + beat * 0.08, 1.25 + beat * 0.11, 0.76 + beat * 0.08);
        }
        if (pulseLight) {
            pulseLight.intensity = 0.52 + beat * 0.72;
        }
        renderer.domElement.setAttribute('data-rotation-x', targetRotationX.toFixed(4));
        renderer.domElement.setAttribute('data-rotation-y', targetRotationY.toFixed(4));
        renderer.domElement.setAttribute('data-dragging', isDragging ? 'true' : 'false');
        applyHeartPartState(t);

        renderer.render(scene, camera);
    }

    function addCoronaryLines() {
        addCoronaryTube([
            new THREE.Vector3(8, 76, 92),
            new THREE.Vector3(2, 18, 98),
            new THREE.Vector3(0, -62, 80),
            new THREE.Vector3(8, -166, 42)
        ], 3.6, 0x243b68, 0.78);
        addCoronaryTube([
            new THREE.Vector3(-8, 72, 96),
            new THREE.Vector3(-22, 14, 98),
            new THREE.Vector3(-20, -72, 78),
            new THREE.Vector3(4, -154, 44)
        ], 2.6, 0xff382e, 0.76);
        addCoronaryTube([
            new THREE.Vector3(26, 70, 88),
            new THREE.Vector3(76, 48, 84),
            new THREE.Vector3(120, 2, 58),
            new THREE.Vector3(98, -76, 28)
        ], 2.4, 0xd62628, 0.62);
        addCoronaryTube([
            new THREE.Vector3(-24, 68, 88),
            new THREE.Vector3(-74, 46, 82),
            new THREE.Vector3(-124, -8, 52),
            new THREE.Vector3(-108, -76, 20)
        ], 2.4, 0xd62628, 0.62);
        addCoronaryTube([
            new THREE.Vector3(18, 54, 90),
            new THREE.Vector3(58, 36, 94),
            new THREE.Vector3(92, 12, 72),
            new THREE.Vector3(118, -26, 44)
        ], 2, 0x2a416f, 0.56);
        addCoronary([
            new THREE.Vector3(-2, 22, 98),
            new THREE.Vector3(-48, 2, 92),
            new THREE.Vector3(-78, -34, 68),
            new THREE.Vector3(-90, -72, 38)
        ], 0xff4b35, 0.42);
        addCoronary([
            new THREE.Vector3(2, -30, 88),
            new THREE.Vector3(44, -36, 88),
            new THREE.Vector3(78, -62, 62),
            new THREE.Vector3(88, -104, 28)
        ], 0xff4b35, 0.4);
        addCoronary([
            new THREE.Vector3(-8, -54, 82),
            new THREE.Vector3(-54, -60, 72),
            new THREE.Vector3(-86, -92, 42),
            new THREE.Vector3(-86, -124, 18)
        ], 0x263f69, 0.42);
        addCoronary([
            new THREE.Vector3(2, -84, 70),
            new THREE.Vector3(34, -98, 62),
            new THREE.Vector3(62, -118, 38),
            new THREE.Vector3(58, -148, 18)
        ], 0xff4b35, 0.36);
    }

    function addCoronaryTube(points, radius, color, opacity) {
        addTube('coronary', points, radius, color, opacity, {
            segments: 44,
            sides: 7,
            meshOpacity: Math.min(0.46, opacity * 0.52),
            pointSize: 1.25,
            pointDensity: 0.72,
            emissive: color === 0x243b68 || color === 0x2a416f ? 0x070b1a : 0x240302,
            specular: 0x7a302b,
            shininess: 12,
            pulse: false
        });
    }

    function addCoronary(points, color, opacity) {
        var lineList = [];
        for (var i = 0; i < 64; i++) {
            var a = sampleCurve(points, i / 64);
            var b = sampleCurve(points, (i + 1) / 64);
            pushSegment(lineList, a, b);
        }
        var coronaryLine = new THREE.LineSegments(makeLineGeometry(lineList), new THREE.LineBasicMaterial({
            color: color,
            transparent: true,
            opacity: opacity,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        }));
        heartRoot.add(coronaryLine);
        registerHeartVisual(coronaryLine, 'coronary');
    }

    function addMuscleFibers() {
        addFiber([
            new THREE.Vector3(-34, 70, 88),
            new THREE.Vector3(-10, 18, 96),
            new THREE.Vector3(-2, -68, 78),
            new THREE.Vector3(8, -164, 40)
        ], 0x140000, 0.58);
        addFiber([
            new THREE.Vector3(-92, 42, 76),
            new THREE.Vector3(-66, 4, 86),
            new THREE.Vector3(-40, -54, 76),
            new THREE.Vector3(-18, -128, 36)
        ], 0x320306, 0.55);
        addFiber([
            new THREE.Vector3(86, 36, 74),
            new THREE.Vector3(66, -10, 84),
            new THREE.Vector3(34, -70, 72),
            new THREE.Vector3(2, -138, 34)
        ], 0x320306, 0.48);
        addFiber([
            new THREE.Vector3(-118, 20, 46),
            new THREE.Vector3(-76, -14, 58),
            new THREE.Vector3(-34, -44, 58),
            new THREE.Vector3(16, -74, 42)
        ], 0x651018, 0.34);
        addFiber([
            new THREE.Vector3(106, 18, 42),
            new THREE.Vector3(72, -18, 56),
            new THREE.Vector3(30, -52, 56),
            new THREE.Vector3(-18, -82, 38)
        ], 0x651018, 0.3);
        addFiber([
            new THREE.Vector3(-88, -6, 92),
            new THREE.Vector3(-62, -36, 86),
            new THREE.Vector3(-26, -86, 62),
            new THREE.Vector3(-8, -146, 32)
        ], 0x5a0b10, 0.3);
        addFiber([
            new THREE.Vector3(96, -2, 84),
            new THREE.Vector3(68, -42, 78),
            new THREE.Vector3(36, -94, 56),
            new THREE.Vector3(22, -150, 30)
        ], 0x5a0b10, 0.28);
        addFiber([
            new THREE.Vector3(-134, 62, 48),
            new THREE.Vector3(-120, 74, 66),
            new THREE.Vector3(-96, 68, 76),
            new THREE.Vector3(-72, 54, 72)
        ], 0x7f1a1d, 0.34);
        addFiber([
            new THREE.Vector3(132, 54, 48),
            new THREE.Vector3(112, 66, 68),
            new THREE.Vector3(88, 60, 76),
            new THREE.Vector3(68, 44, 70)
        ], 0x7f1a1d, 0.34);
        addFiber([
            new THREE.Vector3(-126, 38, 62),
            new THREE.Vector3(-108, 26, 78),
            new THREE.Vector3(-84, 20, 80),
            new THREE.Vector3(-60, 20, 70)
        ], 0x481013, 0.32);
        addFiber([
            new THREE.Vector3(122, 30, 62),
            new THREE.Vector3(102, 18, 78),
            new THREE.Vector3(76, 16, 78),
            new THREE.Vector3(54, 18, 66)
        ], 0x481013, 0.32);
    }

    function addFiber(points, color, opacity) {
        var lineList = [];
        for (var i = 0; i < 52; i++) {
            var a = sampleCurve(points, i / 52);
            var b = sampleCurve(points, (i + 1) / 52);
            pushSegment(lineList, a, b);
        }
        heartRoot.add(new THREE.LineSegments(makeLineGeometry(lineList), new THREE.LineBasicMaterial({
            color: color,
            transparent: true,
            opacity: opacity,
            depthWrite: false
        })));
    }
}());
