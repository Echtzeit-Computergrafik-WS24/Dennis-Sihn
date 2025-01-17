// =====================================================================
// Constants
// =====================================================================

const verticalOffset = -0.75;
const lightRotationSpeed = -0.0008;
const lightTilt = 1;
const lightProjection = Mat4.ortho(-15, 15, -15, 15, -15, 10);

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
const orbitDistance = Sticky("orbitDistance", 7);
onMouseWheel((e) =>
{
    orbitDistance.update((v) => glance.clamp(v * (1 + e.deltaY * 0.001), 1.5, 10.0));
});

/// Resizing the viewport will update the projection matrix.
const cameraProjection = Mat4.perspective(Math.PI / 4, gl.canvas.width / gl.canvas.height, 0.1, 14.);
onResize(() =>
{
    cameraProjection.perspective(Math.PI / 4, gl.canvas.width / gl.canvas.height, 0.1, 14.);
});

// =====================================================================
// Resources
// =====================================================================

const marbleDiffuse = await glance.loadTexture(gl, "https://echtzeit-computergrafik-ws24.github.io/img/marble-diffuse.webp", { wrap: gl.REPEAT });
const marbleSpecular = await glance.loadTexture(gl, "https://echtzeit-computergrafik-ws24.github.io/img/marble-specular.webp", { wrap: gl.REPEAT });

const statueGeo = await glance.loadObj("https://echtzeit-computergrafik-ws24.github.io/geo/lucy100k.obj");


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
const AstronautHelmetGeo = await glance.loadObj("Abgabe/Assets/astrounaut/astronaut-helmet.obj");

const AstronautDiffuse = await glance.loadTexture(gl, "Abgabe/Assets/astrounaut/suit_DIFF2.png", { wrap: gl.REPEAT });
const AstronautNormal = await glance.loadTexture(gl, "Abgabe/Assets/astrounaut/suit_NORM2.png", { wrap: gl.REPEAT });

//add helmet


// -----------------Ice Cream Truck-----------------

const IceCreamTruckGeo = await glance.loadObj("Abgabe/Assets/Car/icetruck.obj");
const IceCreamTruckDiffuse = await glance.loadTexture(gl, "Abgabe/Assets/Car/car_ice.png", { wrap: gl.REPEAT });



// -----------------House-----------------
const HouseGeo = await glance.loadObj("Abgabe/Assets/Buildings/house.obj");
const HouseDiffuse = await glance.loadTexture(gl, "Abgabe/Assets/Buildings/Architecture3_DefaultMaterial_BaseColor.png", { wrap: gl.REPEAT });


/* const groundGeo = await glance.createCircularPlane("ground-geo", {
    radius: 3,
    segments: 64,
});
groundGeo.texCoords = groundGeo.texCoords.map((c) => c * 1.7); // repeat the texture in each axis */

// =====================================================================
// Shadow Buffer
// =====================================================================

const shadowDepthTexture = glance.createTexture(gl, "shadow-depth", 2048, 2048, {
    useAnisotropy: false,
    internalFormat: gl.DEPTH_COMPONENT16,
    levels: 1,
    filter: gl.LINEAR,
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

        float bias = 0.0035;
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

// Shader Program
const geoProgram = glance.createProgram(gl, "geo-shader", geoVSSource, geoFSSource, {
    u_ambientIntensity: 0.04,
    u_specularIntensity: 0.15,
    u_specularPower: 128,
    u_lightProjection: lightProjection,
});

// =====================================================================
// Beauty Pass
// =====================================================================

const statueVao = glance.createVertexArrayObject(gl, "statue-vao",
    statueGeo.indices,
    {
        a_pos: { data: statueGeo.positions, height: 3 },
        a_normal: { data: statueGeo.normals, height: 3 },
        a_texCoord: { data: statueGeo.texCoords, height: 2 },
    },
    geoProgram,
);


// -----------------Landscape-----------------
const landscapeVao = glance.createVertexArrayObject(gl, "landscape-vao",
    landscapeGeo.indices,
    {
        a_pos: { data: landscapeGeo.positions, height: 3 },
        a_normal: { data: landscapeGeo.normals, height: 3 },
        a_texCoord: { data: landscapeGeo.texCoords, height: 2 },
    },
    geoProgram,
);

const landscape = glance.createDrawCall(gl, "landscape",
    landscapeVao,
    geoProgram,
    {
        uniforms: {
            u_modelMatrix: Mat4.identity(),
            u_texDiffuse: landscapeDiffuse,
            //u_texSpecular: landscapeSpecular,
            //u_texNormal: landscapeNormal,
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
    },
    geoProgram,
);

const alien = glance.createDrawCall(gl, "alien",
    alienVao,
    geoProgram,
    {
        uniforms: {
            u_modelMatrix: Mat4.identity(),
            u_texDiffuse: alienDiffuse,
            //u_texSpecular: landscapeSpecular,
            //u_texNormal: landscapeNormal,
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
    },
    geoProgram,
);

const gun = glance.createDrawCall(gl, "gun",
    gunVao,
    geoProgram,
    {
        uniforms: {
            u_modelMatrix: Mat4.identity(),
            u_texDiffuse: alienGunDiffuse,
            //u_texSpecular: landscapeSpecular,
            //u_texNormal: landscapeNormal,
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
    },
    geoProgram,
);

const astronaut = glance.createDrawCall(gl, "astronaut",
    astronautVao,
    geoProgram,
    {
        uniforms: {
            u_modelMatrix: Mat4.identity(),
            u_texDiffuse: AstronautDiffuse,
            //u_texSpecular: landscapeSpecular,
            //u_texNormal: landscapeNormal,
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
            //u_texSpecular: landscapeSpecular,
            //u_texNormal: landscapeNormal,
            u_texShadow: shadowDepthTexture,
        },
        cullFace: gl.BACK,
        depthTest: gl.LESS,
    }
);

// -----------------House-----------------

const houseVao = glance.createVertexArrayObject(gl, "house-vao",
    HouseGeo.indices,
    {
        a_pos: { data: HouseGeo.positions, height: 3 },
        a_normal: { data: HouseGeo.normals, height: 3 },
        a_texCoord: { data:HouseGeo.texCoords, height: 2 },
    },
    geoProgram,
);

const house = glance.createDrawCall(gl, "house",
    houseVao,
    geoProgram,
    {
        uniforms: {
            u_modelMatrix: Mat4.identity(),
            u_texDiffuse: HouseDiffuse,
            //u_texSpecular: landscapeSpecular,
            //u_texNormal: landscapeNormal,
            u_texShadow: shadowDepthTexture,
        },
        cullFace: gl.BACK,
        depthTest: gl.LESS,
    }
);


const statue = glance.createDrawCall(gl, "statue",
    statueVao,
    geoProgram,
    {
        uniforms: {
            u_modelMatrix: Mat4.identity(),
            u_texDiffuse: marbleDiffuse,
            u_texSpecular: marbleSpecular,
            u_texShadow: shadowDepthTexture,
        },
        cullFace: gl.BACK,
        depthTest: gl.LESS,
    }
);

/* const ground = glance.createDrawCall(gl, "ground",
    {
        ibo: groundGeo.indices,
        attributes: {
            a_pos: { data: groundGeo.positions, height: 3 },
            a_normal: { data: groundGeo.normals, height: 3 },
            a_texCoord: { data: groundGeo.texCoords, height: 2 },
        }
    },
    geoProgram,
    {
        uniforms: {
            u_modelMatrix: Mat4.rotateX(Math.PI / -2),
            u_texDiffuse: marbleDiffuse,
            u_texSpecular: marbleSpecular,
            u_texShadow: shadowDepthTexture,
        },
        cullFace: gl.BACK,
        depthTest: gl.LESS,
    }
); */

const skybox = await glance.createSkybox(gl,
    [ 
        "Abgabe/Assets/skybox/corona_ft.png",
        "Abgabe/Assets/skybox/corona_bk.png",
        "Abgabe/Assets/skybox/corona_up.png",
        "Abgabe/Assets/skybox/corona_dn.png",
        "Abgabe/Assets/skybox/corona_rt.png",
        "Abgabe/Assets/skybox/corona_lf.png",
    ],
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

const shadowStatue = glance.createDrawCall(gl, 'shadow-statue', statueVao, shadowProgram, {
    uniforms: {
        u_modelMatrix: Mat4.identity(),
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

const shadowHouse = glance.createDrawCall(gl, 'shadow-house', houseVao, shadowProgram, {
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

        // Render the statue into the shadow map
        // shadowStatue.uniform.u_lightMatrix = lightMatrix;
        // glance.draw(gl, shadowStatue);
        
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

        // Render the house into the shadow map
        shadowHouse.uniform.u_lightMatrix = lightMatrix;
        glance.draw(gl, shadowTruck);
        framebufferStack.pop(gl);
    }

    const renderDebug = false;
    if (renderDebug) { // Render the debug view
        gl.clear(gl.DEPTH_BUFFER_BIT);
        glance.draw(gl, debugView);
    }
    else { // Render the Scene
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        // Render the geometry
        // statue.uniform.u_viewMatrix = viewMatrix;
        // statue.uniform.u_cameraProjection = cameraProjection;
        // statue.uniform.u_viewPosition = viewPos;
        // statue.uniform.u_lightDirection = lightPos;
        // statue.uniform.u_lightMatrix = lightMatrix;
        // glance.draw(gl, statue);

      

        // Render the skybox.
        skybox.uniform.u_viewXform = viewMatrix;
        skybox.uniform.u_projectionXform = cameraProjection;
        glance.draw(gl, skybox);

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

         // Render the astronaut helmet
         helmet.uniform.u_viewMatrix = viewMatrix;
         helmet.uniform.u_cameraProjection = cameraProjection;
         helmet.uniform.u_viewPosition = viewPos;
         helmet.uniform.u_lightDirection = lightPos;
         helmet.uniform.u_lightMatrix = lightMatrix;
         glance.draw(gl, helmet);


        // Render the truck
        truck.uniform.u_viewMatrix = viewMatrix;
        truck.uniform.u_cameraProjection = cameraProjection;
        truck.uniform.u_viewPosition = viewPos;
        truck.uniform.u_lightDirection = lightPos;
        truck.uniform.u_lightMatrix = lightMatrix;
        glance.draw(gl, truck);

        // Render the house
        house.uniform.u_viewMatrix = viewMatrix;
        house.uniform.u_cameraProjection = cameraProjection;
        house.uniform.u_viewPosition = viewPos;
        house.uniform.u_lightDirection = lightPos;
        house.uniform.u_lightMatrix = lightMatrix;
        glance.draw(gl, house);
    }

});