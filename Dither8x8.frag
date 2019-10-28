#ifdef GL_ES
	precision highp float;
#endif

const vec3[16] palette = vec3[](
	
	vec3(0.9222, 0.8824, 0.0667),
	vec3(0.6034, 0.3222, 0.3529),	// This colors can be passed as a uniform
	vec3(0.1354, 0.5455, 0.3451),	//So that we can choose our own color palette
	vec3(0.5444, 0.0980, 0.6000),
	vec3(0.0432, 0.1888, 0.5608),
	vec3(0.1489, 0.4682, 0.8627),
	vec3(0.1875, 0.1633, 0.9608),
	vec3(0.1667, 0.0329, 0.9529),
	vec3(0.0148, 0.6818, 0.2588),
	vec3(0.0169, 0.5298, 0.6588),
	vec3(0.0762, 0.5222, 0.7059),
	vec3(0.1117, 0.4975, 0.7882),
	vec3(0.0556, 0.6000, 0.2353),
	vec3(0.0792, 0.5479, 0.2863),
	vec3(0.0970, 0.5140, 0.4196),
	vec3(0.1078, 0.5397, 0.4941)

);

uniform sampler2D u_tex0;
uniform vec2 u_resolution;

const int[64] dither_table = int[](

	0, 48, 12, 60, 3, 51, 15, 63,
    32, 16, 44, 28, 35, 19, 47, 31,
    8,  56, 4,  52, 11, 59, 7,  55,
    40, 24, 36, 20, 43, 27, 39, 23,
    2,  50, 14, 62, 1,  49, 13, 61,
    34, 18, 46, 30, 33, 17, 45, 29,
    10, 58, 6,  54, 9,  57, 5,  53,
    42, 26, 38, 22, 41, 25, 37, 21

);

vec3 hsv2rgb(vec3 c) {
  vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);

  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

vec3 rgb2hsv(vec3 c)
{
    vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
    vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
    vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));

    float d = q.x - min(q.w, q.y);
    float e = 1.0e-10;
    return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}

float hueDistance(float h1, float h2)
{
	float diff = abs(h1 - h2);
	
	return min(abs(1.0 - diff), diff);
}

const float lightnessSteps = 3.0;

// SOURCE: http://alex-charlton.com/posts/Dithering_on_the_GPU/
float lightnessStep(float l) { 
    return floor((0.5 + l * lightnessSteps)) / lightnessSteps;
}

const float SaturationSteps = 4.0;

float SaturationStep(float s) {
    /* Quantize the saturation to one of SaturationSteps values */
    return floor((0.5 + s * SaturationSteps)) / SaturationSteps;
}

vec3[2] Closest_color(float hue)
{
	vec3 closest = vec3(-2., 0., 0.);
	vec3 secondClosest = vec3(-2., 0., 0.);
	
	vec3 temp;

	for(int i = 0; i < 16; i++)
	{
		temp = palette[i];

		float tempDistance = hueDistance(temp.x, hue);

		if(tempDistance < hueDistance(closest.x, hue))
		{
			secondClosest = closest;
			closest = temp;
		}

		else {
			if(tempDistance < hueDistance(secondClosest.x, hue)) {
				secondClosest = temp;
			}
		}
	}

	vec3[2] result;
	result[0] = closest;
	result[1] = secondClosest;
	return result;
}

vec3 dither(vec2 pos, vec3 color){

	int x = int(mod(pos.x, 8.));
	int y = int(mod(pos.y, 8.));

	int index = x + y * 8;

	float limit = float(dither_table[index]) / 64.;

	vec3[2]Colors = Closest_color(color.x);

	float hueDiff = hueDistance(color.x, Colors[0].x) / hueDistance(Colors[1].x, Colors[0].x);

	float l1 = lightnessStep(max((color.z - 0.125), 0.0));
    float l2 = lightnessStep(min((color.z + 0.124), 1.0));
    float lightnessDiff = (color.z - l1) / (l2 - l1);

    vec3 resultColor = (hueDiff < limit) ? Colors[0] : Colors[1];
    resultColor.z = (lightnessDiff < limit) ? l1 : l2;
	

	float s1 = SaturationStep(max((color.y - 0.125), 0.0));
    float s2 = SaturationStep(min((color.y + 0.124), 1.0));
    float SaturationDiff = (color.y - s1) / (s2 - s1);

    resultColor.y = (SaturationDiff < limit) ? s1 : s2;


	return hsv2rgb(resultColor);

}


void main() {
	
	vec2 UV = gl_FragCoord.xy / u_resolution.xy;
	
	vec4 color = texture2D(u_tex0, UV);
	
	gl_FragColor = vec4(dither(gl_FragCoord.xy, rgb2hsv(color.rgb)), 1.0);
}
