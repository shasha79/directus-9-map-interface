<template>
  <div class="interface-map">
    <div v-if="latlng" class="edit-container">
      <v-input 
        v-model="latlng.name" 
        title="Place name" 
        placeholder="Name" 
        @input="(v) => setValue({ ...latlng, name: v.target.value })"

      />
      <div class="coordinates">
        <v-input
          v-model="latlng.lat"
          title="Place latitude"
          placeholder="Latitude"
          @input="(v) => setValue({ ...latlng, lat: v.target.value })"
        />
        <v-input
          v-model="latlng.lng"
          title="Place longitude"
          placeholder="Longitude"
          @input="(v) => setValue({ ...latlng, lng: v.target.value })"
        />
      </div>
    </div>
    <div :class="{ 'map-readonly': disabled }" class="map">
      <div ref="map" class="map-container" :style="{ height: height + 'px' }">
        <!-- Map Renders Here -->
      </div>

      <div class="map-actions">
        <div v-if="addressToCode" class="address-input">
          <v-input
            v-model="placeName"
            placeholder="Enter address to geocode"
            v-on:keyup.enter="getCoordinatesforPlaceName()"
          ></v-input>
          <button
            v-if="isInteractive"
            v-tooltip="'Set Address Location'"
            @click="getCoordinatesforPlaceName()"
          >
            <v-icon name="search" />
          </button>
        </div>

        <button
          v-if="isInteractive"
          v-tooltip="'Set My Location'"
          class="map-action-btn"
          @click="locateMe()"
        >
          <v-icon name="my_location" />
        </button>

        <button
          v-if="isInteractive"
          v-tooltip="'Clear Location'"
          class="map-action-btn"
          @click="setValue(defaultValue); placeName = ''"
        >
          <v-icon name="clear" />
        </button>
      </div>
    </div>

    <div class="map-coordinates">
      <span v-if="latlng">
        Latitude:
        <b>{{ latlng.lat }}</b>
        ,&nbsp;
      </span>
      <span v-if="latlng">
        Longitude:
        <b>{{ latlng.lng }}</b>
      </span>
    </div>
  </div>
</template>

<script>
import leaflet from "leaflet";
import "./leaflet.css";
import { debounce } from "lodash";

export default {
  emits: ['input'],

  props: {
    value: Object,
    disabled: Boolean,
    height: {
      type: Number,
      default: 400,
    },
    defaultLat: {
      type: Number,
      default: 40.72803624,
    },
    defaultLng: {
      type: Number,
      default: -73.94896388,
    },
    defaultZoom: {
      type: Number,
      default: 10,
    },
    maxZoom: {
      type: Number,
      default: 17,
    },
    addressToCode: {
      type: Boolean,
      default: true,
    },
    theme: {
      type: String,
      default:
        "https://{s}.basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}.png",
    },
  },
  data() {
    return {
      test: null,
      map: null,
      marker: null,
      latlng: null,
      isLocating: false,
      placeName: "",
      mapInteractions: [
        "boxZoom",
        "doubleClickZoom",
        "dragging",
        "keyboard",
        "scrollWheelZoom",
        "tap",
        "touchZoom",
      ],
    };
  },
  computed: {
    isInteractive() {
      return !this.disabled;
    },
    accentColor() {
      return getComputedStyle(document.body)
        .getPropertyValue("--background-inverted")
        .trim();
    },
    darkAccentColor() {
      return getComputedStyle(document.body)
        .getPropertyValue("--background-inverted")
        .trim();
    },
    defaultValue() {
      return { lat: this.defaultLat, lng: this.defaultLng, name: "" };
    },
  },
  mounted() {
    this.init();
  },
  watch: {
    value(newVal) {
      if (newVal && newVal.hasOwnProperty('lat')) {
        this.latlng = newVal;
        this.map.setView([newVal?.lat, newVal?.lng]);
      }
    },

    theme(newVal) {
      leaflet.tileLayer(newVal).addTo(this.map);
    },

    disabled(status) {
      this.toggleMapInteractions(!status);
      this.toggleMarkerInteractions(!status);
      if (status) {
        this.unbindMapEvents();
        this.unbindMarkerEvents();
      } else {
        this.bindMapEvents();
        this.bindMarkerEvents();
      }
    },

    // Automatically update the Marker based on lat & long
    latlng(newVal) {
      this.setMarker(newVal);
    },
  },
  methods: {
    init() {
      let _latlng;
      /**
       * If value is provided on initialization,
       * map should be centered at lat/lng of value
       * else it should center at provided default location.
       */
      if (this.value) {
        _latlng = leaflet.latLng(this.value.lat, this.value.lng);
      } else {
        _latlng = leaflet.latLng(this.defaultLat, this.defaultLng);
      }

      this.createMap(_latlng);
    },

    createMap(latlng) {
      this.map = leaflet.map(this.$refs.map, {
        center: latlng,
        zoom: this.defaultZoom,
        maxZoom: this.maxZoom,
        zoomControl: true,
      });

      /**
       * Set tileLayer
       * tileLayer defines the interface/theme of the map
       * There are serveral tileLayers available here: http://leaflet-extras.github.io/leaflet-providers/preview/
       */
      leaflet
        .tileLayer(this.theme, {
          attribution: '&copy; <a href="https://carto.com/">Carto</a>',
        })
        .addTo(this.map);

      /**
       * Render marker only if value is set.
       */
      this.value ? this.setValue(this.value) : "";

      /**
       * Bind interaction method only in "input" mode
       * For "display" mode, interactions are not required.
       */
      this.isInteractive ? this.bindMapEvents() : this.unbindMapEvents();
    },

    /**
     * Handles Marker Positioning
     */
    setMarker(latlng) {
      if (this.marker) {
        //Hide marker if latlng is provided NULL
        if (latlng) {
          this.marker.setLatLng(latlng).setOpacity(1).update();
        } else {
          this.marker.setOpacity(0);
        }
      } else {
        // Create A Marker Instance
        let markerIcon = leaflet.icon({
          iconUrl: this.markerSVG(),
          iconSize: [36, 36],
          iconAnchor: [18, 36],
        });
        // Set marker on the position
        this.marker = leaflet
          .marker(latlng, {
            icon: markerIcon,
            draggable: this.isInteractive,
          })
          .addTo(this.map);

        if (this.isInteractive) {
          this.bindMarkerEvents();
          this.toggleMapInteractions(true);
        }
      }
    },

    /**
     * Always this function will emit the value.
     * Passing NULL will remove values & hide marker
     */
    setValue({ lat, lng, name }) {
      const latlng = { lat: +lat, lng: +lng, name: name };
      this.$emit("input", JSON.parse(JSON.stringify(latlng)));
    },

    toggleMarkerInteractions(status) {
      status ? this.marker.dragging.enable() : this.marker.dragging.disable();
    },

    unbindMarkerEvents() {
      this.marker.off("drag");
    },

    bindMarkerEvents() {
      // Handle drag event of marker.
      this.marker.on(
        "drag",
        debounce((e) => {
          this.setValue(e.latlng);
        }, 100)
      );
    },

    toggleMapInteractions(status) {
      /**
       * Loop through all the possible interaction option & set status
       */
      this.mapInteractions.forEach((item) => {
        if (this.map[item]) {
          status ? this.map[item].enable() : this.map[item].disable();
        }
      });
    },

    unbindMapEvents() {
      this.map.off("click");
    },

    bindMapEvents() {
      /**
       * Handle click event on the map.
       * This will place marker on clicked point.
       */
      this.map.on("click", (e) => {
        this.setValue({ ...e.latlng, name: this.latlng?.name});
      });

      // User location detection events
      // Location Error
      this.map.on("locationerror", (result) => {
        this.$events.emit("error", {
          notify:
            //This error codes are returned from leaflet library.
            result.code == 1
              ? this.$t("interfaces.map.user_location_error_blocked")
              : this.$t("interfaces.map.user_location_error"),
          error: result,
        });
      });

      //Location Success
      this.map.on("locationfound", (result) => {
        this.setValue(result.latlng);
      });
    },

    //Find User Location
    locateMe() {
      this.map.locate({ setView: true, maxZoom: this.maxZoom });
    },

    markerSVG() {
      // Replace # with %23 so svg also works in Firefox
      return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="${this.accentColor.replace(
        "#",
        "%23"
      )}" stroke-width="1" stroke="${this.darkAccentColor.replace(
        "#",
        "%23"
      )}" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/><path d="M0 0h24v24H0z" fill="none"/></svg>`;
    },

    // Place name for geocode lookup on openstreetmap database via Nominatim, Returns coordinates in [lat,lon]
    async getCoordinatesforPlaceName() {
      try {
        const resp = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURI(
            this.placeName
          )}&format=geojson&addressdetails=1&limit=1`
        );
        if (resp.status === 200) {
          const data = await resp.json();
          if (resp.status === 200) {
            let [lng, lat] = data.features[0]?.geometry.coordinates ?? [
              this.defaultLat,
              this.defaultLng,
            ];
            let name = data.features[0]?.properties.display_name;
            let coordinates = { lat, lng, name };
            this.setValue(coordinates);
            this.map.panTo(new leaflet.LatLng(lat, lng));
          }
        }
      } catch (err) {
        console.log(err);
        throw new Error(err);
      }
    },
  },
};
</script>

<style lang="scss" scoped>
.interface-map {
  --blue-grey-50: #eceff1;
  --blue-grey-100: #cfd8dc;
  --blue-grey-200: #b0bec5;
  --blue-grey-300: #90a4ae;
  --blue-grey-600: #546e7a;

  --input-border-color: var(--blue-grey-100);
  --input-border-color-hover: var(--blue-grey-300);
  --input-border-color-focus: var(--blue-grey-600);

  --input-border-width: 2px;
}

.interface-map {
  overflow-x: auto;
  overflow-y: hidden;
  position: relative;
}

.edit-container {
  .v-input {
    margin-bottom: 8px;
  }

  .coordinates {
    display: flex;
    gap: 8px;
  }
}

.map {
  transition: all var(--fast) var(--transition);
  position: relative;
  display: flex;
  flex-direction: column;
  border: var(--input-border-width) solid var(--input-border-color);
  border-radius: var(--border-radius);
  &:hover {
    border-color: var(--input-border-color-hover);
  }
}

.map-container {
  z-index: 1;
  width: 100%;
  //This is fallback size. Generally this will be overwritten by default size provided in interface config.
  height: var(--width-medium);
  border-radius: inherit;
}

.map-actions {
  position: absolute;
  display: flex;
  width: 100%;
  top: 20px;
  left: 0px;
  padding: 0 20px;
  z-index: 2;
}

.address-input {
  display: flex;

  .v-input {
    width: 250px;
    margin-right: 8px;
    align-items: flex-start;

    &::v-deep .input {
      height: 44px !important;
    }
  }

  button {
    transition: all var(--fast) var(--transition);
    width: 44px;
    height: 44px;
    border-radius: var(--border-radius);
    color: var(--white);
    background: var(--blue-grey-200);
    margin-right: 8px;
    &:hover {
      background: var(--blue-grey-300);
    }
  }
}

.map-action-btn {
  transition: var(--fast) var(--transition) color;
  height: 44px;
  width: 44px;
  border-radius: var(--border-radius);
  color: var(--white);
  background: var(--blue-grey-200);
  margin-right: 8px;

  &:hover {
    background: var(--blue-grey-300);
  }
}

.map-coordinates {
  position: absolute;
  bottom: 2px;
  left: 2px;
  z-index: 1;
  padding: 4px 8px 4px 4px;
  background-color: rgba(255, 255, 255, 0.6);
  border-radius: 0 var(--border-radius) 0 0;
  span {
    color: var(--blue-grey-300);
    text-transform: initial;
    font-style: italic;
  }
}

//Read Only Map
.map-disabled {
  .map-container {
    filter: grayscale(100%);
    opacity: 0.8;
  }
}

@media only screen and (max-width: 800px) {
  .map {
    display: flex;
  }
}
</style>
