

// =====================================================================
// Constants
// =====================================================================

const verticalOffset = -0.75;
const lightRotationSpeed = -0.0008;
const lightTilt = 1;
const lightProjection = Mat4.ortho(-15, 15, -15, 15, -10, 20);

//const lightProjection = Mat4.ortho(-0.5, 0.5, -0.8, 0.95, -0.8, 3,1);

// =====================================================================
// Interactivity
// =====================================================================


/// The user can orbit the camera around the world origin...

const orbitPan = Sticky("orbitPan", 0);
const orbitTilt = Sticky("orbitTilt", 0);
onMouseDrag((e) =>
{
    orbitPan.update((v) => v - e.movementX * 0.008);
    orbitTilt.update((v) => glance.clamp(v - e.movementY * 0.008, -Math.PI / 2, Math.PI / 2));
});
/// ... and zoom in and out.
const orbitDistance = Sticky("orbitDistance", 10);
onMouseWheel((e) =>
{
    orbitDistance.update((v) => glance.clamp(v * (1 + e.deltaY * 0.001), 1.5, 20.0));
});

/// Resizing the viewport will update the projection matrix.
const cameraProjection = Mat4.perspective(Math.PI / 4, gl.canvas.width / gl.canvas.height, 0.1, 40.);
onResize(() =>
{
    cameraProjection.perspective(Math.PI / 4, gl.canvas.width / gl.canvas.height, 0.1, 40.);
});


// =====================================================================
// Resources
// =====================================================================

// -----------------Landscape-----------------
const landscapeGeo = await glance.loadObj("Abgabe/Assets/Landscape/mars.obj");
const landscapeDiffuse = await glance.loadTexture(gl, "Abgabe/Assets/Landscape/colormap-mars.jpg", { wrap: gl.REPEAT });
const landscapeNormal = await glance.loadTexture(gl, "Abgabe/Assets/Landscape/normalmap.jpg", { wrap: gl.REPEAT });

// -----------------Alien-----------------
const alienGeo = await glance.loadObj("Abgabe/Assets/alienb/alienChar.obj");
const alienGunGeo = await glance.loadObj("Abgabe/Assets/alienb/gun.obj");

const alienDiffuse = await glance.loadTexture(gl, "Abgabe/Assets/alienb/Alien_low_AlienHominid_BaseColor.png", { wrap: gl.REPEAT });
const alienNormal = await glance.loadTexture(gl, "Abgabe/Assets/alienb/Alien_low_AlienHominid_Normal.png", { wrap: gl.REPEAT });

const alienGunDiffuse = await glance.loadTexture(gl, "Abgabe/Assets/alienb/Blaster_Blaster_BaseColor.png", { wrap: gl.REPEAT });
const alienGunNormal = await glance.loadTexture(gl, "Abgabe/Assets/alienb/Blaster_Blaster_Normal.png", { wrap: gl.REPEAT });
const alienGunMetallic = await glance.loadTexture(gl, "Abgabe/Assets/alienb/Blaster_Blaster_Metallic.png", { wrap: gl.REPEAT });

// -----------------Astronaut-----------------
const AstronautGeo = await glance.loadObj("Abgabe/Assets/astrounaut/astronaut-body.obj");
const AstronautHelmetGeo = await glance.loadObj("Abgabe/Assets/astrounaut/helmet.obj");

const AstronautDiffuse = await glance.loadTexture(gl, "Abgabe/Assets/astrounaut/suit_DIFF2.png", { wrap: gl.REPEAT });
const AstronautNormal = await glance.loadTexture(gl, "Abgabe/Assets/astrounaut/suit_NORM2.png", { wrap: gl.REPEAT });

// -----------------Ice Cream Truck-----------------
const IceCreamTruckGeo = await glance.loadObj("Abgabe/Assets/Car/car-only.obj");
const IceCreamTruckDiffuse = await glance.loadTexture(gl, "Abgabe/Assets/Car/car_ice.png", { wrap: gl.REPEAT });

const IceCreamTruckWindowGeo = await glance.loadObj("Abgabe/Assets/Car/car-windows.obj");
const IceCreamTruckWindowDiffuse = await glance.loadTexture(gl, "Abgabe/Assets/Car/car_ice.png", { wrap: gl.REPEAT });
// -----------------House-----------------
const HouseGeo = await glance.loadObj("Abgabe/Assets/Buildings/house.obj");
const HouseDiffuse = await glance.loadTexture(gl, "Abgabe/Assets/Buildings/Architecture3_DefaultMaterial_BaseColor.png", { wrap: gl.REPEAT });
const HouseNormal = await glance.loadTexture(gl, "Abgabe/Assets/Buildings/Architecture3_DefaultMaterial_Normal.png", { wrap: gl.REPEAT });
const HouseMetallic = await glance.loadTexture(gl, "Abgabe/Assets/Buildings/Architecture 3_DefaultMaterial_Metallic.png", { wrap: gl.REPEAT });

// -----------------Pyramid-----------------
const pyramidGeo = await glance.loadObj("Abgabe/Assets/pyramid/pyramid.obj");
const pyramidDiffuse = await glance.loadTexture(gl, "Abgabe/Assets/pyramid/PyramidGlowingModelV1_DefaultMaterial_BaseColor.png", { wrap: gl.REPEAT });
const pyramidNormal = await glance.loadTexture(gl, "Abgabe/Assets/pyramid/PyramidGlowingModelV1_DefaultMaterial_Normal.png", { wrap: gl.REPEAT });
const pyramidEmmisive = await glance.loadTexture(gl, "Abgabe/Assets/pyramid/PyramidGlowingModelV1_DefaultMaterial_Emissive.png", { wrap: gl.REPEAT });

// -------- Ice Cream sign ---------

const signGeo = await glance.loadObj("Abgabe/Assets/icecreamsign/sign.obj");
const signDiffuse = await glance.loadTexture(gl, "Abgabe/Assets/icecreamsign/il_fullxfull.763356308_bhd0.jpg", { wrap: gl.REPEAT });



// =====================================================================
// Shadow Buffer
// =====================================================================

const shadowDepthTexture = glance.createTexture(gl, "shadow-depth", 2048, 2048, {
    useAnisotropy: false,
    internalFormat: gl.DEPTH_COMPONENT16,
    levels: 1,
    filter: gl.NEAREST,
    compareFunc: gl.LEQUAL,
});

const shadowFramebuffer = glance.createFramebuffer(gl, "shadow-framebuffer", null, shadowDepthTexture);



// =====================================================================
// Geometry
// =====================================================================

// Vertex Shader Source
const geoVSSource = `#version 300 es
    precision highp float;

    uniform mat4 u_modelMatrix;
    uniform mat4 u_viewMatrix;
    uniform mat4 u_cameraProjection;
    uniform mat4 u_lightMatrix;
    uniform mat4 u_lightProjection;

    in vec3 a_pos;
    in vec3 a_normal;
    in vec2 a_texCoord;

    out vec3 f_posWorldSpace;
    out vec4 f_posLightSpace;
    out vec3 f_normal;
    out vec2 f_texCoord;

    void main() {
        vec4 worldPosition = u_modelMatrix * vec4(a_pos, 1.0);
        f_posWorldSpace = worldPosition.xyz;
        f_posLightSpace = u_lightProjection * u_lightMatrix * worldPosition;
        f_normal = (u_modelMatrix * vec4(a_normal, 0.0)).xyz;
        f_texCoord = a_texCoord;

        gl_Position = u_cameraProjection * u_viewMatrix * worldPosition;
    }
`;

// Fragment Shader Source
const geoFSSource = `#version 300 es
    precision mediump float;

    uniform float u_ambientIntensity;
    uniform float u_specularPower;
    uniform float u_specularIntensity;
    uniform vec3 u_viewPosition;
    uniform vec3 u_lightDirection;
    uniform sampler2D u_texDiffuse;
    uniform sampler2D u_texSpecular;
    uniform mediump sampler2DShadow u_texShadow;

    in vec3 f_posWorldSpace;
    in vec4 f_posLightSpace;
    in vec3 f_normal;
    in vec2 f_texCoord;

    out vec4 o_fragColor;

    float calculateShadow() {
        // Perspective divide.
        vec3 projCoords = f_posLightSpace.xyz / f_posLightSpace.w;

        // Transform to [0,1] range.
        projCoords = projCoords * 0.5 + 0.5;

        // No shadow for fragments outside of the light's frustum.
        if(any(lessThan(projCoords, vec3(0))) || any(greaterThan(projCoords, vec3(1)))){
            return 1.0;
        }

        float bias = 0.004;
        return texture(u_texShadow, vec3(projCoords.xy, projCoords.z - bias));
    }

    void main() {
        // texture
        vec3 texDiffuse = texture(u_texDiffuse, f_texCoord).rgb;
        vec3 texSpecular = texture(u_texSpecular, f_texCoord).rgb;

        // lighting
        vec3 normal = normalize(f_normal);
        vec3 lightDir = u_lightDirection;
        vec3 viewDir = normalize(u_viewPosition - f_posWorldSpace);
        vec3 halfWay = normalize(viewDir + lightDir);

        // ambient
        vec3 ambient = texDiffuse * u_ambientIntensity;

        // diffuse
        float diffuseIntensity = max(dot(normal, lightDir), 0.0) * (1.0 - u_ambientIntensity);
        vec3 diffuse = texDiffuse * diffuseIntensity;

        // specular
        float specularFactor = pow(max(dot(normal, halfWay), 0.0), u_specularPower);
        vec3 specular = texSpecular * specularFactor * u_specularIntensity;

        // shadow
        float shadow = calculateShadow();

        // result
        o_fragColor = vec4(ambient + shadow * (diffuse + specular), 1.0);
    }
`;


const normalVSSource = `#version 300 es
    precision highp float;

    uniform mat4 u_modelMatrix;
    uniform mat4 u_viewMatrix;
    uniform mat4 u_cameraProjection;
    uniform mat4 u_lightMatrix;
    uniform mat4 u_lightProjection;

    in vec3 a_pos;
    in vec3 a_normal;
    in vec3 a_tangent;
    in vec2 a_texCoord;

    out vec3 f_posWorldSpace;
    out vec4 f_posLightSpace;
    out vec3 f_normal;
    out vec2 f_texCoord;
    out mat3 f_TBN; // TangentBitangetNormal matrix for normal mapping

    void main() {
        vec4 worldPosition = u_modelMatrix * vec4(a_pos, 1.0);
        f_posWorldSpace = worldPosition.xyz;
        f_posLightSpace = u_lightProjection * u_lightMatrix * worldPosition;
        
        // Calculate TBN matrix
        vec3 normal = normalize((u_modelMatrix * vec4(a_normal, 0.0)).xyz);
        vec3 tangent = normalize((u_modelMatrix * vec4(a_tangent, 0.0)).xyz);
        vec3 bitangent = cross(normal, tangent);
        f_TBN = mat3(tangent, bitangent, normal);
        
        f_normal = normal;
        f_texCoord = a_texCoord;

        gl_Position = u_cameraProjection * u_viewMatrix * worldPosition;
    }
`;
const normalFSSource = `#version 300 es
    precision mediump float;

    uniform float u_ambientIntensity;
    uniform float u_specularPower;
    uniform float u_specularIntensity;
    uniform vec3 u_viewPosition;
    uniform vec3 u_lightDirection;
    uniform sampler2D u_texDiffuse;
    uniform sampler2D u_texSpecular;
    uniform sampler2D u_texNormal;
    uniform sampler2D u_Metallic;
    uniform mediump sampler2DShadow u_texShadow;

    in vec3 f_posWorldSpace;
    in vec4 f_posLightSpace;
    in vec3 f_normal;
    in vec2 f_texCoord;
    in mat3 f_TBN;

    out vec4 o_fragColor;

    float calculateShadow() {
        vec3 projCoords = f_posLightSpace.xyz / f_posLightSpace.w;
        projCoords = projCoords * 0.5 + 0.5;
        if(any(lessThan(projCoords, vec3(0))) || any(greaterThan(projCoords, vec3(1)))){
            return 1.0;
        }
        float bias = 0.0035;
        return texture(u_texShadow, vec3(projCoords.xy, projCoords.z - bias));
    }

    void main() {
        // texture
        vec3 texDiffuse = texture(u_texDiffuse, f_texCoord).rgb;
        vec3 texSpecular = texture(u_texSpecular, f_texCoord).rgb;
        float metallic = texture(u_Metallic, f_texCoord).r;
        // Normal mapping
        vec3 normalMap = texture(u_texNormal, f_texCoord).rgb * 2.0 - 1.0;
        vec3 normal = normalize(f_TBN * normalMap);

        // lighting
        vec3 lightDir = u_lightDirection;
        vec3 viewDir = normalize(u_viewPosition - f_posWorldSpace);
        vec3 halfWay = normalize(viewDir + lightDir);

        // ambient
        vec3 ambient = texDiffuse * u_ambientIntensity;

        // diffuse
        float diffuseIntensity = max(dot(normal, lightDir), 0.0) * (1.0 - u_ambientIntensity);
        vec3 diffuse = texDiffuse * diffuseIntensity;

        // specular
        float specularFactor = pow(max(dot(normal, halfWay), 0.0), u_specularPower);
        vec3 specular = texSpecular * specularFactor * u_specularIntensity;

        // shadow
        float shadow = calculateShadow();

        // result
        o_fragColor = vec4(ambient + shadow * (diffuse + specular), 1.0);
    }
`;



// Shader Program
const geoProgram = glance.createProgram(gl, "geo-shader", geoVSSource, geoFSSource, {
    u_ambientIntensity: 0.04,
    u_specularIntensity: 0.15,
    u_specularPower: 128,
    u_lightProjection: lightProjection,
});

const normalProgram = glance.createProgram(gl, "normal-shader", normalVSSource, normalFSSource, {
    u_ambientIntensity: 0.04,
    u_specularIntensity: 0.15,
    u_specularPower: 128,
    u_lightProjection: lightProjection,
});




// =====================================================================
// Beauty Pass
// =====================================================================


// -----------------Landscape-----------------
const landscapeVao = glance.createVertexArrayObject(gl, "landscape-vao",
    landscapeGeo.indices,
    {
        a_pos: { data: landscapeGeo.positions, height: 3 },
        a_normal: { data: landscapeGeo.normals, height: 3 },
        a_texCoord: { data: landscapeGeo.texCoords, height: 2 },
        a_tangent: { data: landscapeGeo.tangents, height: 3 }, // Add tangents
    },
    normalProgram,
);

const landscape = glance.createDrawCall(gl, "landscape",
    landscapeVao,
    normalProgram,
    {
        uniforms: {
            u_modelMatrix: Mat4.identity(),
            u_texDiffuse: landscapeDiffuse,
            u_texNormal: landscapeNormal,  
            u_texShadow: shadowDepthTexture,
        },
        cullFace: gl.BACK,
        depthTest: gl.LESS,
    }
);


// -----------------Alien-----------------
const alienVao = glance.createVertexArrayObject(gl, "alien-vao",
    alienGeo.indices,
    {
        a_pos: { data: alienGeo.positions, height: 3 },
        a_normal: { data: alienGeo.normals, height: 3 },
        a_texCoord: { data: alienGeo.texCoords, height: 2 },
        a_tangent: { data: alienGeo.tangents, height: 3 },
    },
    normalProgram,
);

const alien = glance.createDrawCall(gl, "alien",
    alienVao,
    normalProgram,
    {
        uniforms: {
            u_modelMatrix: Mat4.identity(),
            u_texDiffuse: alienDiffuse,
            //u_texSpecular: landscapeSpecular,
            u_texNormal: alienNormal,
            u_texShadow: shadowDepthTexture,
        },
        cullFace: gl.BACK,
        depthTest: gl.LESS,
    }
);

// -----------------Gun-----------------

const gunVao = glance.createVertexArrayObject(gl, "gun-vao",
    alienGunGeo.indices,
    {
        a_pos: { data: alienGunGeo.positions, height: 3 },
        a_normal: { data: alienGunGeo.normals, height: 3 },
        a_texCoord: { data: alienGunGeo.texCoords, height: 2 },
        a_tangent: { data: alienGunGeo.tangents, height: 3 },
    },
    normalProgram,
);

const gun = glance.createDrawCall(gl, "gun",
    gunVao,
    normalProgram,
    {
        uniforms: {
            u_modelMatrix: Mat4.identity(),
            u_texDiffuse: alienGunDiffuse,
            //u_texSpecular: landscapeSpecular,
            u_texNormal: alienGunNormal,
            u_texShadow: shadowDepthTexture,
        },
        cullFace: gl.BACK,
        depthTest: gl.LESS,
    }
);


// -----------------Astronaut-----------------

const astronautVao = glance.createVertexArrayObject(gl, "astronaut-vao",
    AstronautGeo.indices,
    {
        a_pos: { data: AstronautGeo.positions, height: 3 },
        a_normal: { data: AstronautGeo.normals, height: 3 },
        a_texCoord: { data:AstronautGeo.texCoords, height: 2 },
        a_tangent: { data: AstronautGeo.tangents, height: 3 },
    },
    normalProgram,
);

const astronaut = glance.createDrawCall(gl, "astronaut",
    astronautVao,
    normalProgram,
    {
        uniforms: {
            u_modelMatrix: Mat4.identity(),
            u_texDiffuse: AstronautDiffuse,
            u_texNormal: AstronautNormal,
            u_texShadow: shadowDepthTexture,
        },
        cullFace: gl.BACK,
        depthTest: gl.LESS,
    }
);

const helmetVao = glance.createVertexArrayObject(gl, "helmet-vao",
    AstronautHelmetGeo.indices,
    {
        a_pos: { data: AstronautHelmetGeo.positions, height: 3 },
        a_normal: { data: AstronautHelmetGeo.normals, height: 3 },
        a_texCoord: { data:AstronautHelmetGeo.texCoords, height: 2 },
    },
    geoProgram,
);

const helmet = glance.createDrawCall(gl, "helmet",
    helmetVao,
    geoProgram,
    {
        uniforms: {
            u_modelMatrix: Mat4.identity(),
            //u_texDiffuse: AstronautDiffuse,
            //u_texSpecular: landscapeSpecular,
            //u_texNormal: landscapeNormal,
            u_texShadow: shadowDepthTexture,
        },
        cullFace: gl.BACK,
        depthTest: gl.LESS,
    }
);



// -----------------Ice Cream Truck-----------------

const truckVao = glance.createVertexArrayObject(gl, "truck-vao",
    IceCreamTruckGeo.indices,
    {
        a_pos: { data: IceCreamTruckGeo.positions, height: 3 },
        a_normal: { data: IceCreamTruckGeo.normals, height: 3 },
        a_texCoord: { data:IceCreamTruckGeo.texCoords, height: 2 },
    },
    geoProgram,
);

const truck = glance.createDrawCall(gl, "truck",
    truckVao,
    geoProgram,
    {
        uniforms: {
            u_modelMatrix: Mat4.identity(),
            u_texDiffuse: IceCreamTruckDiffuse,
            u_texShadow: shadowDepthTexture,
        },
        cullFace: gl.BACK,
        depthTest: gl.LESS,
    }
);


// -----------------Pyramid-----------------

const pyramidVao = glance.createVertexArrayObject(gl, "pyramid-vao",
    pyramidGeo.indices,
    {
        a_pos: { data: pyramidGeo.positions, height: 3 },
        a_normal: { data: pyramidGeo.normals, height: 3 },
        a_texCoord: { data: pyramidGeo.texCoords, height: 2 },
        a_tangent: { data: pyramidGeo.tangents, height: 3 },
    },
    normalProgram,
);

const pyramid = glance.createDrawCall(gl, "pyramid",   
    pyramidVao,
    normalProgram,
    {
        uniforms: {
            u_texDiffuse: pyramidDiffuse,
            u_texNormal: pyramidNormal,
            u_texShadow: shadowDepthTexture,
        },
        cullFace: gl.BACK,
        depthTest: gl.LESS,
    }
);



const skybox = await glance.createSkybox(gl,
    [
        "Abgabe/Assets/skybox2/px.png",
        "Abgabe/Assets/skybox2/nx.png",
        "Abgabe/Assets/skybox2/py.png",
        "Abgabe/Assets/skybox2/ny.png",
        "Abgabe/Assets/skybox2/pz.png",
        "Abgabe/Assets/skybox2/nz.png",
    ],
);
// =====================================================================
// Reflections
// =====================================================================

const reflectionFSSource = `#version 300 es
	precision mediump float;

    /// World-space position of the camera.
    uniform vec3 u_viewPosition;

    /// Skybox texture (cubemap-)sampler
    uniform samplerCube u_skybox;

    /// Interpolated normal of the fragment in world-space.
    in vec3 f_normal;

    /// Interpolated position of the fragment in world-space.
    in vec3 f_posWorldSpace;

    /// Output color of the fragment.
	out vec4 o_fragColor;

	void main() {
        // Constants
        vec3 lightDirection = normalize(vec3(-1.0, 1.0, -1.0));
        float ambient = 0.07;   // Ambient intensity in range [0, 1]
        float shininess = 64.0; // Specular shininess

        vec3 normal = normalize(f_normal);
        vec3 viewDirection = normalize(u_viewPosition - f_posWorldSpace);
        vec3 halfWay = normalize(viewDirection + lightDirection);

        float diffuse = max(0.0, dot(normal, lightDirection));
        float specular = pow(max(0.0, dot(normal, halfWay)), shininess);

        float reflectionIntensity = 0.999;
        vec3 reflectionDirection = reflect(-viewDirection, normal);
        vec3 reflection = texture(u_skybox, reflectionDirection).rgb *0.5;

        o_fragColor = vec4(
            mix(
                vec3(ambient + diffuse + specular),
                reflection,
                reflectionIntensity
            ),
            1.0
        );
	}
`;

const reflectionProgram = glance.createProgram(gl, "geo-shader", geoVSSource, reflectionFSSource);

// -----------------Helmet-----------------
const helmet2Vao = glance.createVertexArrayObject(gl, "helmet2-vao",
    AstronautHelmetGeo.indices,
    {
        a_pos: { data: AstronautHelmetGeo.positions, height: 3 },
        a_normal: { data: AstronautHelmetGeo.normals, height: 3 },
        a_texCoord: { data: AstronautHelmetGeo.texCoords, height: 2 },
    },
    reflectionProgram,
);
const helmet2 = glance.createDrawCall(gl, "helmet2",
    helmet2Vao,
    reflectionProgram,
    {
        uniforms: {
            u_skybox: skybox.textures.u_skybox,},
        cullFace: gl.BACK,
        depthTest: gl.LESS,
    }
);

const truckWindowVao = glance.createVertexArrayObject(gl, "truckwindow-vao",
    IceCreamTruckWindowGeo.indices,
    {
        a_pos: { data: IceCreamTruckWindowGeo.positions, height: 3 },
        a_normal: { data: IceCreamTruckWindowGeo.normals, height: 3 },
        a_texCoord: { data:IceCreamTruckWindowGeo.texCoords, height: 2 },
    },
    reflectionProgram,
);

const truckWindow = glance.createDrawCall(gl, "truckwindow",
    truckWindowVao,
    reflectionProgram,
    {
        uniforms: {
            u_skybox: skybox.textures.u_skybox,},
        cullFace: gl.BACK,
        depthTest: gl.LESS,
    }
);

// =====================================================================
// Shadow Mapping
// =====================================================================

const shadowVSSource = `#version 300 es
    precision highp float;

    uniform mat4 u_modelMatrix;
    uniform mat4 u_lightMatrix;
    uniform mat4 u_lightProjection;

    in vec3 a_pos;

    void main()
    {
        gl_Position = u_lightProjection * u_lightMatrix * u_modelMatrix * vec4(a_pos, 1.0);
    }
`;


const shadowFSSource = `#version 300 es
    precision mediump float;

    void main() {}
`;

const shadowProgram = glance.createProgram(gl, "shadow-shader", shadowVSSource, shadowFSSource, {
    u_lightProjection: lightProjection,
});

const shadowPyramid = glance.createDrawCall(gl, 'shadow-pyramid', pyramidVao, shadowProgram, {
    uniforms: {
        u_modelMatrix: Mat4.translate(-6,4.5,-6.6),
    },
    cullFace: gl.BACK,
    depthTest: gl.LESS,
});

const shadowAlien = glance.createDrawCall(gl, 'shadow-alien', alienVao, shadowProgram, {
    uniforms: {
        u_modelMatrix: Mat4.identity(),
    },
    cullFace: gl.BACK,
    depthTest: gl.LESS,
});

const shadowGun = glance.createDrawCall(gl, 'shadow-gun', gunVao, shadowProgram, {
    uniforms: {
        u_modelMatrix: Mat4.identity(),
    },
    cullFace: gl.BACK,
    depthTest: gl.LESS,
});

const shadowAstronaut = glance.createDrawCall(gl, 'shadow-astronaut', astronautVao, shadowProgram, {
    uniforms: {
        u_modelMatrix: Mat4.identity(),
    },
    cullFace: gl.BACK,
    depthTest: gl.LESS,
});

const shadowTruck = glance.createDrawCall(gl, 'shadow-truck', truckVao, shadowProgram, {
    uniforms: {
        u_modelMatrix: Mat4.identity(),
    },
    cullFace: gl.BACK,
    depthTest: gl.LESS,
});


// =====================================================================
// Debug View
// =====================================================================

const debugShader = `#version 300 es
precision mediump float;

uniform sampler2D u_sampler;

in vec2 f_texCoord;

out vec4 o_fragColor;

void main() {
    o_fragColor = vec4(vec3(texture(u_sampler, f_texCoord).r), 1.0);
}`;

const debugView = await glance.createScreenPass(gl, "debugview",
    debugShader,
    {
        textures: {
            u_sampler: shadowDepthTexture,
        },
    },
);


// =====================================================================
// rgbShift
// =====================================================================
const rgbShiftFSSource = `#version 300 es
precision mediump float;
uniform float u_time;
uniform sampler2D u_texture;
uniform vec3 u_viewPosition;

in vec2 f_texCoord;
in vec3 f_worldPos;
in vec3 f_normal;

out vec4 o_fragColor;

void main() {
    // Calculate the color offset directions
    float angle = u_time;
    vec2 red_offset = vec2(cos(angle), sin(angle));
    angle += radians(120.0);
    vec2 green_offset = vec2(cos(angle), sin(angle));
    angle += radians(120.0);
    vec2 blue_offset = vec2(cos(angle), sin(angle));
    
    // Calculate the offset size as a function of the pixel distance to the center
    float offset_size = 0.05;
    // Extract the pixel color values from the input texture
    float red = texture(u_texture, f_texCoord - offset_size * red_offset).r;
    float green = texture(u_texture, f_texCoord - offset_size * green_offset).g;
    float blue = texture(u_texture, f_texCoord - offset_size * blue_offset).b;
    
    // Fragment shader output
    o_fragColor = vec4(red, green, blue, 1.0);
}
`;

const rgbShiftProgram = glance.createProgram(gl, "rgbShift-shader", geoVSSource, rgbShiftFSSource);

const signVao = glance.createVertexArrayObject(gl, "sign-vao",
    signGeo.indices,
    {
        a_pos: { data: signGeo.positions, height: 3 },
        a_normal: { data: signGeo.normals, height: 3 },
        a_texCoord: { data: signGeo.texCoords, height: 2 },
    },
    rgbShiftProgram,
);

const sign = glance.createDrawCall(gl, "sign",
    signVao,
    rgbShiftProgram,
    {
        uniforms: {
            u_texture: signDiffuse,
        },
        depthTest: gl.LESS,
    }
);


// =====================================================================
// Render Loop
// =====================================================================

// Framebuffer stack
const framebufferStack = new glance.FramebufferStack();


setRenderLoop(({ globalTime }) =>
{
    // Update the user camera
    const viewPos = Vec3.of(0, 0, orbitDistance.get()).rotateX(orbitTilt.get()).rotateY(orbitPan.get());
    const viewMatrix = Mat4.lookAt(viewPos, Vec3.zero(), Vec3.yAxis()).translateY(verticalOffset);

    // Update the light position
    const lightMatrix = Mat4.rotateX(lightTilt).rotateY(globalTime * -lightRotationSpeed).translateY(verticalOffset);
    const lightPos = Vec3.of(0, 0, 1).rotateMat4(Mat4.transposeOf(lightMatrix));

    { // Render the shadow map
        framebufferStack.push(gl, shadowFramebuffer);
        gl.clear(gl.DEPTH_BUFFER_BIT);
  
        // Render the alien into the shadow map
        shadowAlien.uniform.u_lightMatrix = lightMatrix;
        glance.draw(gl, shadowAlien);

        // Render the gun into the shadow map
        shadowGun.uniform.u_lightMatrix = lightMatrix;
        glance.draw(gl, shadowGun);

        // Render the astronaut into the shadow map
        shadowAstronaut.uniform.u_lightMatrix = lightMatrix;
        glance.draw(gl, shadowAstronaut);

        // Render the truck into the shadow map
        shadowTruck.uniform.u_lightMatrix = lightMatrix;
        glance.draw(gl, shadowTruck);

        // Render the pyramid into the shadow map
        shadowPyramid.uniform.u_lightMatrix = lightMatrix;
        shadowPyramid.uniform.u_modelMatrix = Mat4.translate(-6,4.5,-6.6).rotateX(0.001 * globalTime).rotateY(0.001 * globalTime);
        glance.draw(gl, shadowPyramid);

       
        framebufferStack.pop(gl);     
    }

    const renderDebug = false;
    if (renderDebug) { // Render the debug view
        gl.clear(gl.DEPTH_BUFFER_BIT);
        glance.draw(gl, debugView);
    }
    else { // Render the Scene
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        
 
        // Render the landscape
        landscape.uniform.u_viewMatrix = viewMatrix;
        landscape.uniform.u_cameraProjection = cameraProjection;
        landscape.uniform.u_viewPosition = viewPos;
        landscape.uniform.u_lightDirection = lightPos;
        landscape.uniform.u_lightMatrix = lightMatrix;
        glance.draw(gl, landscape);    
        
        // Render the alien
        alien.uniform.u_viewMatrix = viewMatrix;
        alien.uniform.u_cameraProjection = cameraProjection;
        alien.uniform.u_viewPosition = viewPos;
        alien.uniform.u_lightDirection = lightPos;
        alien.uniform.u_lightMatrix = lightMatrix;
        glance.draw(gl, alien); 

        // Render the alien gun
        alien.uniform.u_viewMatrix = viewMatrix;
        alien.uniform.u_cameraProjection = cameraProjection;
        alien.uniform.u_viewPosition = viewPos;
        alien.uniform.u_lightDirection = lightPos;
        alien.uniform.u_lightMatrix = lightMatrix;
        glance.draw(gl, gun);

        // Render the astronaut
        astronaut.uniform.u_viewMatrix = viewMatrix;
        astronaut.uniform.u_cameraProjection = cameraProjection;
        astronaut.uniform.u_viewPosition = viewPos;
        astronaut.uniform.u_lightDirection = lightPos;
        astronaut.uniform.u_lightMatrix = lightMatrix;
        glance.draw(gl, astronaut);

   
        // Render the truck
        truck.uniform.u_viewMatrix = viewMatrix;
        truck.uniform.u_cameraProjection = cameraProjection;
        truck.uniform.u_viewPosition = viewPos;
        truck.uniform.u_lightDirection = lightPos;
        truck.uniform.u_lightMatrix = lightMatrix;
        glance.draw(gl, truck);

        // Render the truck window

        truckWindow.uniform.u_viewMatrix = viewMatrix;
        truckWindow.uniform.u_cameraProjection = cameraProjection;
        truckWindow.uniform.u_viewPosition = viewPos;
        glance.draw(gl, truckWindow);

        // Render the helmet
        helmet2.uniform.u_viewMatrix = viewMatrix;
        helmet2.uniform.u_cameraProjection = cameraProjection;
        helmet2.uniform.u_viewPosition = viewPos;
        glance.draw(gl, helmet2);

        // Render the pyramid
        pyramid.uniform.u_viewMatrix = viewMatrix;
        pyramid.uniform.u_cameraProjection = cameraProjection;
        pyramid.uniform.u_viewPosition = viewPos;
        pyramid.uniform.u_lightDirection = lightPos;
        pyramid.uniform.u_lightMatrix = lightMatrix;
        pyramid.uniform.u_modelMatrix = Mat4.translate(-6,4.5,-6.6).rotateX(0.001 * globalTime).rotateY(0.001 * globalTime);
        glance.draw(gl, pyramid);


        // Render the sign
        sign.uniform.u_viewMatrix = viewMatrix;
        sign.uniform.u_cameraProjection = cameraProjection;
        sign.uniform.u_modelMatrix = Mat4.translate(1, 4, 1).rotateX(1.57).rotateZ(0.001 * globalTime);
        glance.draw(gl, sign);

        // Render the skybox
        skybox.uniform.u_viewXform = viewMatrix;
        skybox.uniform.u_projectionXform = cameraProjection;
        glance.draw(gl, skybox);
    }

    
});