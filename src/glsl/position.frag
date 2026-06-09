uniform vec2 resolution;
uniform sampler2D texturePosition;
uniform sampler2D textureDefaultPosition;
uniform float time;
uniform float speed;
uniform float curlSize;
uniform float dieSpeed;
uniform float radius;
uniform float initAnimation;
uniform float deltaRatio;

uniform vec3 uBoundBox;
uniform float uEmitterDistanceRatio;
uniform float uEmitterSpeed;

uniform sampler2D uTextureVolume;
uniform vec4 uSliceInfo;

#pragma glslify: curl = require(./helpers/curl4)
#pragma glslify: sampleAs3DTexture = require(./helpers/sampleAs3DTexture)

vec3 getColor3(in vec3 pos) {
    return sampleAs3DTexture( uTextureVolume, floor(pos + vec3(uBoundBox.x * 0.5, 200.0, uBoundBox.z * 0.5)) / uBoundBox, uSliceInfo).rgb;
}

void main() {

    vec2 uv = gl_FragCoord.xy / resolution.xy;

    vec4 positionInfo = texture2D( texturePosition, uv );
    vec3 position = positionInfo.xyz * smoothstep(0.0, 0.3, initAnimation);
    float color;

    float life = fract(positionInfo.w) - dieSpeed * deltaRatio;
    float side = step(0.5, uv.x) * 2.0 - 1.0;
    float initForce = pow(initAnimation, 2.5);

    if(life < 0.001) {
        positionInfo = texture2D( textureDefaultPosition, uv );
        position = positionInfo.xyz * (1.0 + sin(time * 15.0) * 0.2) * radius;
        position.x += side * uBoundBox.x * 0.5 * uEmitterDistanceRatio * initForce;
        color = side * 0.5 + 0.5;
        life = 0.5 + fract(positionInfo.w * 21.4131 + time) * 0.499;
    } else {
        position.x -= speed * side * uEmitterSpeed * smoothstep(-1.0, -0.5, -life) * initForce * deltaRatio;

        float progress = 1.0 - smoothstep(0.08, 0.98, life);
        float helixStrength = initForce * smoothstep(0.02, 0.38, progress) * (1.0 - smoothstep(0.78, 1.0, progress) * 0.45);
        float pulse = sin(time * 2.1 + uv.y * 22.0 + side * 1.7) * 0.5 + 0.5;
        float helixPhase = progress * 15.0 + side * 3.14159265 + uv.y * 6.5 + time * 0.55;
        vec2 helix = vec2(sin(helixPhase), cos(helixPhase)) * (62.0 + pulse * 38.0);
        float helixPull = speed * helixStrength * 0.055 * deltaRatio;
        position.y += (50.0 + helix.x - position.y) * helixPull;
        position.z += (helix.y - position.z) * helixPull;

        position += curl(position * curlSize, time * 2.3, 1.2 + (1.0 - life) * 0.35) * speed * (1.75 - life) * deltaRatio;

        vec3 color3 = getColor3(positionInfo.xyz);

        // color3 += getColor3(positionInfo.xyz + vec3(1.0, 0.0, 0.0));
        // color3 += getColor3(positionInfo.xyz + vec3(-1.0, 0.0, 0.0));
        // color3 += getColor3(positionInfo.xyz + vec3(0.0, 1.0, 0.0));
        // color3 += getColor3(positionInfo.xyz + vec3(0.0, -1.0, 0.0));
        // color3 += getColor3(positionInfo.xyz + vec3(0.0, 0.0, 1.0));
        // color3 += getColor3(positionInfo.xyz + vec3(0.0, 0.0, -1.0));

        color = clamp((color3.r - color3.g) / max(0.0, color3.b), -1.0, 1.0)  * 0.5 + 0.5;

    }

    life = life + floor(color * 8192.0);
    position.xyz = clamp(position.xyz, vec3(-uBoundBox.x * 0.49, -198.0, -uBoundBox.z * 0.49), vec3(uBoundBox.x * 0.49, uBoundBox.y -198.0, uBoundBox.z * 0.49));
    gl_FragColor = vec4(position, life);

}
