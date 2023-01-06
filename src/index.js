import InterfaceComponent from './interface.vue';

export default {
	id: 'custom-map',
	name: 'Custom Map',
	icon: 'place',
	description: 'Custom map interface',
	component: InterfaceComponent,
	types: ['json'],
	options: [
    {
      field: "height",
      name: "Height (400px)",
      type: "number",
      meta: {
        width: "full",
        interface: "numeric",
      },
    },
    {
      field: "defaultLat",
      name: "Default Latitude (40.72803624)",
      type: "number",
      meta: {
        width: "half",
        interface: "numeric",
      },
    },
    {
      field: "defaultLng",
      name: "Default Longitude (-73.94896388)",
      type: "number",
      meta: {
        width: "half",
        interface: "numeric",
      },
    },
    {
      field: "defaultZoom",
      name: "Default Zoom (12)",
      type: "number",
      meta: {
        width: "half",
        interface: "numeric",
      },
    },
    {
      field: "maxZoom",
      name: "Max Zoom (17)",
      type: "number",
      meta: {
        width: "half",
        interface: "numeric",
      },
    },
    {
      field: "addressToCode",
      name: "Address Input (true)",
      type: "boolean",
      meta: {
        width: "half",
        interface: "boolean",
      },
    },
    {
      field: "theme",
      name: "Interface Theme (Grayscale)",
      type: "string",
      meta: {
        width: "half",
        interface: "select-dropdown",
        options: {
          choices: [
            {
              text: "Grayscale",
              value:
                "https://{s}.basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}.png",
            },
            {
              text: "Color",
              value:
                "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
            },
          ],
        },
      },
    },
  ],
};
