import { useEffect, useRef } from "react";
import * as THREE from "three";

export default function StadiumScene() {
  const hostRef = useRef(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;

    let renderer;

    try {
      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        powerPreference: "high-performance",
      });
    } catch {
      return undefined;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));

    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;

    host.appendChild(renderer.domElement);

    // ---------------------------------------------------------
    // SCENE
    // ---------------------------------------------------------

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);

    camera.position.set(0, 0.5, 8);

    // ---------------------------------------------------------
    // LIGHTING
    // ---------------------------------------------------------

    const ambient = new THREE.AmbientLight(0x8aa4c8, 1.5);

    scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0xffead1, 3.5);

    keyLight.position.set(-4, 5, 6);
    scene.add(keyLight);

    const accentBlueLight = new THREE.PointLight(0x3f88ff, 18, 15);

    accentBlueLight.position.set(3, 0.5, 2);
    scene.add(accentBlueLight);

    const blueLight = new THREE.PointLight(0x4f75ff, 12, 18);

    blueLight.position.set(-4, 3, -2);
    scene.add(blueLight);

    // ---------------------------------------------------------
    // MAIN STAGE
    // ---------------------------------------------------------

    const stage = new THREE.Group();
    scene.add(stage);

    // Stadium sits behind the ball
    const stadium = new THREE.Group();
    stadium.position.set(0, -1.65, -2.2);

    stage.add(stadium);

    // ---------------------------------------------------------
    // STADIUM FIELD
    // ---------------------------------------------------------

    const field = new THREE.Mesh(
      new THREE.CircleGeometry(3.55, 96),
      new THREE.MeshStandardMaterial({
        color: 0x122443,
        roughness: 0.92,
        metalness: 0,
      }),
    );

    field.rotation.x = -Math.PI / 2;
    field.scale.set(1, 0.55, 1);

    stadium.add(field);

    // Inner field
    const innerField = new THREE.Mesh(
      new THREE.CircleGeometry(2.75, 96),
      new THREE.MeshStandardMaterial({
        color: 0x1b4d87,
        roughness: 0.9,
      }),
    );

    innerField.rotation.x = -Math.PI / 2;
    innerField.scale.set(1, 0.55, 1);
    innerField.position.y = 0.015;

    stadium.add(innerField);

    // ---------------------------------------------------------
    // BOUNDARY
    // ---------------------------------------------------------

    const boundary = new THREE.Mesh(
      new THREE.TorusGeometry(3.25, 0.035, 8, 96),
      new THREE.MeshStandardMaterial({
        color: 0xe7d6a1,
        roughness: 0.6,
      }),
    );

    boundary.rotation.x = Math.PI / 2;
    boundary.scale.set(1, 0.55, 1);

    boundary.position.y = 0.045;

    stadium.add(boundary);

    // ---------------------------------------------------------
    // CRICKET PITCH
    // ---------------------------------------------------------

    const pitch = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 0.025, 2.15),
      new THREE.MeshStandardMaterial({
        color: 0xc7a875,
        roughness: 0.95,
      }),
    );

    pitch.position.set(0, 0.04, 0);
    stadium.add(pitch);

    // ---------------------------------------------------------
    // CREASE LINES
    // ---------------------------------------------------------

    const creaseMaterial = new THREE.MeshBasicMaterial({
      color: 0xf4ead5,
    });

    const creasePositions = [-0.68, 0.68];

    creasePositions.forEach((z) => {
      const crease = new THREE.Mesh(
        new THREE.BoxGeometry(0.95, 0.01, 0.025),
        creaseMaterial,
      );

      crease.position.set(0, 0.07, z);

      stadium.add(crease);
    });

    // ---------------------------------------------------------
    // WICKETS
    // ---------------------------------------------------------

    function createWicket(z) {
      const wicket = new THREE.Group();

      const material = new THREE.MeshStandardMaterial({
        color: 0xe9dfc9,
        roughness: 0.55,
      });

      for (let i = -1; i <= 1; i++) {
        const stump = new THREE.Mesh(
          new THREE.CylinderGeometry(0.018, 0.018, 0.42, 8),
          material,
        );

        stump.position.set(i * 0.075, 0.27, z);

        wicket.add(stump);
      }

      for (let i = 0; i < 2; i++) {
        const bail = new THREE.Mesh(
          new THREE.BoxGeometry(0.075, 0.018, 0.025),
          material,
        );

        bail.position.set(i === 0 ? -0.038 : 0.038, 0.49, z);

        wicket.add(bail);
      }

      stadium.add(wicket);
    }

    createWicket(-0.8);
    createWicket(0.8);

    // ---------------------------------------------------------
    // STADIUM SEATING RINGS
    // ---------------------------------------------------------

    const seatingMaterial = new THREE.MeshStandardMaterial({
      color: 0x111827,
      roughness: 0.8,
      metalness: 0.05,
    });

    for (let i = 0; i < 4; i++) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(4.05 + i * 0.27, 0.17, 8, 96),
        seatingMaterial,
      );

      ring.rotation.x = Math.PI / 2;

      ring.scale.set(1, 0.52, 1);

      ring.position.y = 0.25 + i * 0.19;

      stadium.add(ring);
    }

    // ---------------------------------------------------------
    // CROWD LIGHTS
    // ---------------------------------------------------------

    const crowdCount = 500;

    const crowdPositions = new Float32Array(crowdCount * 3);

    const crowdColors = new Float32Array(crowdCount * 3);

    const crowdGeometry = new THREE.BufferGeometry();

    for (let i = 0; i < crowdCount; i++) {
      const angle = Math.random() * Math.PI * 2;

      const radius = 4.15 + Math.random() * 0.9;

      crowdPositions[i * 3] = Math.cos(angle) * radius;

      crowdPositions[i * 3 + 1] = 0.35 + Math.random() * 0.8;

      crowdPositions[i * 3 + 2] = Math.sin(angle) * radius * 0.52;

      const brightness = 0.5 + Math.random() * 0.5;

      crowdColors[i * 3] = brightness;

      crowdColors[i * 3 + 1] = brightness;

      crowdColors[i * 3 + 2] = brightness;
    }

    crowdGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(crowdPositions, 3),
    );

    crowdGeometry.setAttribute(
      "color",
      new THREE.BufferAttribute(crowdColors, 3),
    );

    const crowdMaterial = new THREE.PointsMaterial({
      size: 0.035,
      transparent: true,
      opacity: 0.75,
      vertexColors: true,
      depthWrite: false,
    });

    const crowd = new THREE.Points(crowdGeometry, crowdMaterial);

    stadium.add(crowd);

    // ---------------------------------------------------------
    // FLOODLIGHT TOWERS
    // ---------------------------------------------------------

    function createFloodlight(x, z, rotationY) {
      const tower = new THREE.Group();

      tower.position.set(x, -0.3, z);

      tower.rotation.y = rotationY;

      const poleMaterial = new THREE.MeshStandardMaterial({
        color: 0x596273,
        roughness: 0.6,
        metalness: 0.65,
      });

      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.045, 0.075, 3.5, 8),
        poleMaterial,
      );

      pole.position.y = 1.7;

      tower.add(pole);

      const panel = new THREE.Mesh(
        new THREE.BoxGeometry(0.48, 0.32, 0.08),
        new THREE.MeshBasicMaterial({
          color: 0xfff8dc,
        }),
      );

      panel.position.set(0, 3.42, 0);

      tower.add(panel);

      const light = new THREE.PointLight(0xfff4d2, 8, 7);

      light.position.set(0, 3.35, 0.2);

      tower.add(light);

      stadium.add(tower);

      return light;
    }

    const floodLights = [
      createFloodlight(-4.25, -1.5, 0.2),
      createFloodlight(4.25, -1.5, -0.2),
      createFloodlight(-3.8, 2.4, 0),
      createFloodlight(3.8, 2.4, Math.PI),
    ];

    // ---------------------------------------------------------
    // CRICKET BALL
    // ---------------------------------------------------------

    const ballGroup = new THREE.Group();

    ballGroup.position.set(0, 0.1, 0.2);

    stage.add(ballGroup);

    const ball = new THREE.Mesh(
      new THREE.SphereGeometry(1.22, 64, 48),
      new THREE.MeshPhysicalMaterial({
        color: 0xb91f27,
        roughness: 0.3,
        metalness: 0.03,
        clearcoat: 0.55,
        clearcoatRoughness: 0.22,
      }),
    );

    ballGroup.add(ball);

    // ---------------------------------------------------------
    // BALL SEAM
    // ---------------------------------------------------------

    const seamPoints = [];

    const seamRadius = 1.238;

    for (let index = 0; index <= 180; index++) {
      const angle = (index / 180) * Math.PI * 2;

      const bend = 0.33 * Math.sin(angle * 2);

      seamPoints.push(
        new THREE.Vector3(
          seamRadius * Math.cos(angle) * Math.cos(bend),

          seamRadius * Math.sin(angle) * Math.cos(bend),

          seamRadius * Math.sin(bend),
        ),
      );
    }

    const seamCurve = new THREE.CatmullRomCurve3(seamPoints);

    const seam = new THREE.Mesh(
      new THREE.TubeGeometry(seamCurve, 180, 0.027, 8, false),
      new THREE.MeshStandardMaterial({
        color: 0xf3dfc9,
        roughness: 0.72,
      }),
    );

    ballGroup.add(seam);

    // ---------------------------------------------------------
    // BALL STITCHING
    // ---------------------------------------------------------

    const stitches = [];

    for (let index = 0; index < 52; index++) {
      const angle = (index / 52) * Math.PI * 2;

      const bend = 0.33 * Math.sin(angle * 2);

      const nextAngle = angle + 0.032;

      const nextBend = 0.33 * Math.sin(nextAngle * 2);

      const point = (value, curveBend) =>
        new THREE.Vector3(
          1.255 * Math.cos(value) * Math.cos(curveBend),

          1.255 * Math.sin(value) * Math.cos(curveBend),

          1.255 * Math.sin(curveBend),
        );

      stitches.push(point(angle, bend), point(nextAngle, nextBend));
    }

    const stitchGeometry = new THREE.BufferGeometry().setFromPoints(stitches);

    const stitchLines = new THREE.LineSegments(
      stitchGeometry,
      new THREE.LineBasicMaterial({
        color: 0xffead8,
        transparent: true,
        opacity: 0.9,
      }),
    );

    ballGroup.add(stitchLines);

    // ---------------------------------------------------------
    // GOLD ORBIT
    // ---------------------------------------------------------

    const goldOrbit = new THREE.Mesh(
      new THREE.TorusGeometry(1.85, 0.012, 8, 128),
      new THREE.MeshBasicMaterial({
        color: 0xe7bd64,
        transparent: true,
        opacity: 0.65,
      }),
    );

    goldOrbit.rotation.set(0.82, 0.12, -0.3);

    ballGroup.add(goldOrbit);

    // ---------------------------------------------------------
    // BLUE ORBIT
    // ---------------------------------------------------------

    const blueOrbit = new THREE.Mesh(
      new THREE.TorusGeometry(2.08, 0.007, 6, 128),
      new THREE.MeshBasicMaterial({
        color: 0x62aaff,
        transparent: true,
        opacity: 0.4,
      }),
    );

    blueOrbit.rotation.set(0.62, -0.4, 0.32);

    ballGroup.add(blueOrbit);

    // ---------------------------------------------------------
    // ORIGINAL TOURNAMENT BADGE
    // ---------------------------------------------------------

    function createBadge() {
      const canvas = document.createElement("canvas");

      canvas.width = 512;
      canvas.height = 256;

      const context = canvas.getContext("2d");

      context.clearRect(0, 0, 512, 256);

      context.beginPath();

      context.arc(256, 128, 105, 0, Math.PI * 2);

      context.strokeStyle = "#e7bd64";

      context.lineWidth = 8;

      context.stroke();

      context.fillStyle = "#ffffff";

      context.font = "bold 72px Arial";

      context.textAlign = "center";

      context.textBaseline = "middle";

      context.fillText("CPL", 256, 112);

      context.font = "bold 20px Arial";

      context.fillStyle = "#62aaff";

      context.fillText("CRICKET PREMIER", 256, 168);

      const texture = new THREE.CanvasTexture(canvas);

      texture.colorSpace = THREE.SRGBColorSpace;

      return texture;
    }

    const badge = new THREE.Mesh(
      new THREE.PlaneGeometry(0.72, 0.36),
      new THREE.MeshBasicMaterial({
        map: createBadge(),
        transparent: true,
        depthWrite: false,
      }),
    );

    badge.position.set(0.85, 1.1, 0.2);

    badge.rotation.y = -0.25;

    ballGroup.add(badge);

    // ---------------------------------------------------------
    // PARTICLES
    // ---------------------------------------------------------

    const particleCount = 180;

    const particlePositions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      particlePositions[i * 3] = (Math.random() - 0.5) * 10;

      particlePositions[i * 3 + 1] = (Math.random() - 0.5) * 6;

      particlePositions[i * 3 + 2] = -Math.random() * 5;
    }

    const particleGeometry = new THREE.BufferGeometry();

    particleGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(particlePositions, 3),
    );

    const particleMaterial = new THREE.PointsMaterial({
      color: 0xe9d6a1,
      size: 0.018,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
    });

    const particles = new THREE.Points(particleGeometry, particleMaterial);

    stage.add(particles);

    // ---------------------------------------------------------
    // SOFT GROUND GLOW
    // ---------------------------------------------------------

    const glow = new THREE.Mesh(
      new THREE.CircleGeometry(2.4, 64),
      new THREE.MeshBasicMaterial({
        color: 0x102c55,
        transparent: true,
        opacity: 0.22,
        depthWrite: false,
      }),
    );

    glow.rotation.x = -Math.PI / 2;

    glow.position.set(0, -1.42, -1.8);

    glow.scale.set(1.5, 0.55, 1);

    stage.add(glow);

    // ---------------------------------------------------------
    // RESPONSIVE
    // ---------------------------------------------------------

    const resize = () => {
      const { width, height } = host.getBoundingClientRect();

      if (!width || !height) return;

      renderer.setSize(width, height, false);

      camera.aspect = width / height;

      if (width < 420) {
        camera.position.z = 9.2;

        camera.position.y = 0.65;

        ballGroup.scale.setScalar(0.88);
      } else if (width < 700) {
        camera.position.z = 8.5;

        ballGroup.scale.setScalar(0.94);
      } else {
        camera.position.z = 8;

        ballGroup.scale.setScalar(1);
      }

      camera.updateProjectionMatrix();

      renderer.render(scene, camera);
    };

    const observer = new ResizeObserver(resize);

    observer.observe(host);

    resize();

    // ---------------------------------------------------------
    // ANIMATION
    // ---------------------------------------------------------

    let frameId;

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const clock = new THREE.Clock();

    const animate = () => {
      const elapsed = clock.getElapsedTime();

      // Main ball rotation
      ballGroup.rotation.y += 0.0028;

      ballGroup.rotation.x = Math.sin(elapsed * 0.7) * 0.035;

      // Orbits
      goldOrbit.rotation.z += 0.002;

      blueOrbit.rotation.z -= 0.0015;

      // Floating particles
      particles.rotation.y = elapsed * 0.015;

      particles.position.y = Math.sin(elapsed * 0.25) * 0.035;

      // Very subtle stadium light breathing
      floodLights.forEach((light, index) => {
        light.intensity = 7.5 + Math.sin(elapsed * 1.2 + index) * 0.7;
      });

      // Slight cinematic stage movement
      stage.rotation.y = Math.sin(elapsed * 0.12) * 0.025;

      renderer.render(scene, camera);

      if (!reducedMotion) {
        frameId = window.requestAnimationFrame(animate);
      }
    };

    if (reducedMotion) {
      renderer.render(scene, camera);
    } else {
      animate();
    }

    // ---------------------------------------------------------
    // CLEANUP
    // ---------------------------------------------------------

    return () => {
      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }

      observer.disconnect();

      scene.traverse((object) => {
        if (object.geometry) {
          object.geometry.dispose();
        }

        if (object.material) {
          if (Array.isArray(object.material)) {
            object.material.forEach((material) => {
              material.dispose();

              if (material.map) {
                material.map.dispose();
              }
            });
          } else {
            object.material.dispose();

            if (object.material.map) {
              object.material.map.dispose();
            }
          }
        }
      });

      renderer.dispose();

      if (renderer.domElement.parentNode) {
        renderer.domElement.remove();
      }
    };
  }, []);

  return (
    <div
      ref={hostRef}
      className="stadium-scene"
      aria-hidden="true"
      style={{
        width: "100%",
        height: "100%",
        minHeight: "420px",
        overflow: "hidden",
      }}
    />
  );
}
