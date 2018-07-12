var M, m, G //Mapa, marcador

var err = document.getElementById('error')

function iniciarMapa() {
	M = new google.maps.Map(document.getElementById('mapa'), {
		center: {lat: 4.629425, lng: -74.0900203},
		zoom: 13,
		mapTypeControl: false,
	})

	M.addListener('click', function(e) {
	  ubicarMarcador(e.latLng.lat(), e.latLng.lng())
	  Clima.obtenerPorCoordenadas(e.latLng.lat(), e.latLng.lng()).then( dts => {
	  	nomUbiPorCoordenadas(e.latLng.lat(), e.latLng.lng())
	  })
	})

	ubicación.obtenerSinErrores()

	G = new google.maps.Geocoder
}


function ubicarMarcador(lat, lng) {
	if(!m){
		m = new google.maps.Marker({
			position: {lat: lat, lng: lng},
			map: M,
			draggable: true,
		})

		m.addListener('dragend', function(e) {
			Clima.obtenerPorCoordenadas(e.latLng.lat(), e.latLng.lng())
			nomUbiPorCoordenadas(e.latLng.lat(), e.latLng.lng())
		})
		return
	}

	m.setPosition({lat: lat, lng: lng})

	err.style.display = 'none'
	err.innerHTML = ''
}

function nomUbiPorCoordenadas(lat, lng){
	G.geocode({'location': {lat: lat, lng: lng}}, (results, status) => {
		if(status === 'OK') {
			if(results) {
				let dir
				if(results.length >= 3){
					dir = results[2].formatted_address
				} else if(results.length >= 2){
					dir = results[1].formatted_address
				} else if(results.length >= 1){
					dir = results[0].formatted_address
				} else {
					return
				}
				document.getElementById('lugar').innerHTML = dir
			}
		}
	})
}

var ubicación = {
	obtener: function(){
		document.getElementById('ciudad').value = ''
		if(navigator.geolocation){
			navigator.geolocation.getCurrentPosition(this.correcto, this.fallo)
		} else {
			err.innerHTML = 'Este navegador no soporta geolocalización.'
			err.style.display = 'block'
		}
	},
	obtenerSinErrores: function(){
		if(navigator.geolocation){
			navigator.geolocation.getCurrentPosition(this.correcto)
		}
	},
	correcto: function(datos){
		err.innerHTML = ''
		err.style.display = 'none'
		ubicarMarcador(datos.coords.latitude, datos.coords.longitude)
		M.setCenter({lat: datos.coords.latitude, lng: datos.coords.longitude})
		M.setZoom(16)
		Clima.obtenerPorCoordenadas(datos.coords.latitude, datos.coords.longitude).then( dts => {
			nomUbiPorCoordenadas(datos.coords.latitude, datos.coords.longitude)
		})
	},
	fallo: function(error){
		switch(error.code) {
			case error.PERMISSION_DENIED:
				err.innerHTML = 'Debe autorizar la solicitud de geolocalización.'
				err.style.display = 'block'
				break
			case error.POSITION_UNAVAILABLE:
				err.innerHTML = 'Geolocalización no disponible. Pruebe en otro computador o red.'
				err.style.display = 'block'
				break
			case error.TIMEOUT:
				err.innerHTML = 'Debe autorizar la solicitud de geolocalización.'
				err.style.display = 'block'
				break
			case error.UNKNOWN_ERROR:
				err.innerHTML = 'Ocurrió un error. Intente en otro computador o red.'
				err.style.display = 'block'
				break
			default:
				err.innerHTML = 'Ocurrió un error. Intente en otro computador o red.'
				err.style.display = 'block'
				break
		}
	},
}

var Clima = {
	obtener: function(url){
		this.restaurarDatos()
		err.style.display = 'none'
		err.innerHTML = ''

		return new Promise( (resolve, reject) => {
			axios.get(url).then( rta => {
				if(!rta.data || !rta.data.main){
					err.innerHTML = 'Ocurrió un error.'
					err.style.display = 'block'
					reject()
					return
				}

				this.datos('clima-temperatura', `${Math.round((rta.data.main.temp - 273.15) * 100) / 100} °C`)
				this.datos('clima-humedad', `${rta.data.main.humidity}%`)
				this.datos('clima-viento', `${Math.round(rta.data.wind.speed / 1000 * 3600 * 100) / 100} km/h`)
				this.datos('clima-presión', `${rta.data.main.pressure} hPa`)
				this.datos('clima-nubes', `${rta.data.clouds.all}%`)
				resolve(rta.data)
			}).catch( er => {
				err.innerHTML = 'Ocurrió un error. Verifique su conexión a internet y el nombre de la ciudad.'
				err.style.display = 'block'
				reject()
			})
		})
	},
	obtenerPorCoordenadas: function(lat, lng){
		return this.obtener(`https://api.openweathermap.org/data/2.5/weather?APPID=6d61df0e45527ca170239992b3e97cfa&lat=${lat}&lon=${lng}`)
	},
	obtenerPorCiudad: function(ciudad){
		let P = new Promise( (resolve, reject) => {
			G.geocode({'address': ciudad}, (results, status) => {
				if(status === 'OK') {
					this.obtenerPorCoordenadas(results[0].geometry.location.lat(), results[0].geometry.location.lng()).then( dts => {
						resolve(dts)
					}).catch( er => {
						reject()
					})
				} else {
					reject()
				}
			})
		})

		return P
		//return this.obtener(`https://api.openweathermap.org/data/2.5/weather?APPID=6d61df0e45527ca170239992b3e97cfa&q=${ciudad}`)
	},
	datos: function(id, html){
		document.getElementById(id).innerHTML = html
	},
	restaurarDatos: function(){
		this.datos('clima-temperatura', '')
		this.datos('clima-humedad', '')
		this.datos('clima-viento', '')
		this.datos('clima-presión', '')
		this.datos('clima-nubes', '')
		this.datos('lugar', '&nbsp;')
	},
}

function obtCiudad(){
	let c = document.getElementById('ciudad').value
	if(!c || c.length < 3){
		alert('Escriba el nombre completo de una ciudad.')
		return
	}

	Clima.obtenerPorCiudad(c).then( datos => {
		ubicarMarcador(datos.coord.lat, datos.coord.lon)
		M.setCenter({lat: datos.coord.lat, lng: datos.coord.lon})
		M.setZoom(12)
		nomUbiPorCoordenadas(datos.coord.lat, datos.coord.lon)
	})
}

function obtCiudadInp(e){
	if(e.keyCode == 13){
		obtCiudad()
	}
}
