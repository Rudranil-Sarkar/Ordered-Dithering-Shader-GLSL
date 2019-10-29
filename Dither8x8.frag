#ifdef GL_ES
	precision highp float;
#endif

const vec3[16] palette = vec3[](
	
	vec3(.9222, .8824, .0667),
	vec3(.6034, .3222, .3529), // This colors can be passed as a uniform
	vec3(.1354, .5455, .3451), //So that we can choose our own color palette
	vec3(.5444, .0980, .6000),
	vec3(.0432, .1888, .5608),
	vec3(.1489, .4682, .8627),
	vec3(.1875, .1633, .9608),
	vec3(.1667, .0329, .9529),
	vec3(.0148, .6818, .2588),
	vec3(.0169, .5298, .6588),
	vec3(.0762, .5222, .7059),
	vec3(.1117, .4975, .7882),
	vec3(.0556, .6000, .2353),
	vec3(.0792, .5479, .2863),
	vec3(.0970, .5140, .4196),
	vec3(.1078, .5397, .4941)
	
);

uniform sampler2D u_tex0;
uniform vec2 u_resolution;

const int[64]dither_table = int[](
	
	0, 48, 12, 60, 3, 51, 15, 63,
	32, 16, 44, 28, 35, 19, 47, 31,
	8, 56, 4, 52, 11, 59, 7, 55,
	40, 24, 36, 20, 43, 27, 39, 23,
	2, 50, 14, 62, 1, 49, 13, 61,
	34, 18, 46, 30, 33, 17, 45, 29,
	10, 58, 6, 54, 9, 57, 5, 53,
	42, 26, 38, 22, 41, 25, 37, 21
	
);

vec3 hsl2rgb(vec3 c)
{
	vec3 rgb = clamp(abs(mod(c.x*6.+vec3(0.,4.,2.),6.)-3.)-1.,0.,1.);
	
	return c.z + c.y * (rgb - .5) * (1. - abs(2. * c.z - 1.));
}

vec3 rgb2hsl(vec3 c) {
	float h = 0.;
	float s = 0.;
	float l = 0.;
	float r = c.r;
	float g = c.g;
	float b = c.b;
	float cMin = min(r, min(g, b));
	float cMax = max(r, max(g, b));
	
	l = (cMax + cMin) / 2.;
	if (cMax > cMin) {
		float cDelta = cMax - cMin;
		s = l < .0 ? cDelta / (cMax+cMin) : cDelta / (2. - (cMax + cMin));
		if(r == cMax) {
			h = (g - b) / cDelta;
		} else if(g == cMax) {
			h = 2. + (b - r) / cDelta;
		} else {
			h = 4. + (r - g) / cDelta;
		}
		
		if(h < 0.) {
			h += 6.;
		}
		h = h / 6.;
	}
	return vec3(h, s, l);
}

float hueDistance(float h1, float h2)
{
	float diff = abs(h1 - h2);
	
	return min(abs(1. - diff), diff);
}

const float lightnessSteps = 4.0;

// SOURCE: http://alex-charlton.com/posts/Dithering_on_the_GPU/
float lightnessStep(float l) {
	return floor((.5 + l * lightnessSteps)) / lightnessSteps;
}

const float SaturationSteps = 4.;

float SaturationStep(float s) {
	/* Quantize the saturation to one of SaturationSteps values */
	return floor((.5 + s * SaturationSteps)) / SaturationSteps;
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
		
		else{
			if(tempDistance < hueDistance(secondClosest.x, hue)){
				secondClosest = temp;
			}
		}
		
	}
	
	vec3[2] result;
	result[0] = closest;
	result[1] = secondClosest;
	return result;
}

vec3 dither(vec2 pos,vec3 color){
	
	int x = int(mod(pos.x, 8.));
	int y = int(mod(pos.y, 8.));
	
	int index = x + y * 8;
	
	float limit = float(dither_table[index]) / 64.;
	
	vec3[2] Colors = Closest_color(color.x);
	
	float hueDiff = hueDistance(color.x, Colors[0].x) / hueDistance(Colors[1].x, Colors[0].x);
	
	float l1 = lightnessStep(max((color.z - .125), 0.));
	float l2 = lightnessStep(min((color.z + .124), 1.));
	float lightnessDiff = (color.z - l1) / (l2 - l1);
	
	vec3 resultColor = (hueDiff < limit) ? Colors[0] : Colors[1];
	resultColor.z = (lightnessDiff < limit) ? l1 : l2;
	
	float s1 = SaturationStep(max((color.y - .125), 0.));
	float s2 = SaturationStep(min((color.y + .124), 1.));
	float SaturationDiff = (color.y - s1) / (s2 - s1);
	
	resultColor.y = (SaturationDiff < limit) ? s1: s2;
	
	return hsl2rgb(resultColor);
	
}

void main(){
	
	vec2 UV = gl_FragCoord.xy / u_resolution.xy;
	
	vec4 color = texture2D(u_tex0, UV);
	
	gl_FragColor = vec4(dither(gl_FragCoord.xy, rgb2hsl(color.rgb)), 1.);
}
