// ws://54.147.26.233:9090
var app = new Vue({
    el: '#app',
    // // storing the state of the page
    data: {
        connected: false,
        ros: null,
        ws_address: 'ws://192.168.0.3:9090',
        logs: [],
        loading: false,
        topic: null,
        message: null,
        enable_accel: false,
        accel_timer: '',
        maxLin: 0.6,
        maxAng: 0.3,
        curLin: 0,
        curAng: 0,
        nipple_manager: null,
        options: {
            zone: document.getElementById('zone_joystick'),
            threshold: 0.1,
            position: { left: 50 + '%' },
            mode: 'static',
            size: 150,
            color: '#000000',
        }
    },
    // helper methods to connect to ROS
    methods: {
        connect: function () {
            this.loading = true
            this.ros = new ROSLIB.Ros({
                url: this.ws_address
            })
            this.ros.on('connection', () => {
                this.logs.unshift((new Date()).toTimeString() + ' - Connected!')
                this.connected = true
                this.loading = false
            })
            this.ros.on('error', (error) => {
                this.logs.unshift((new Date()).toTimeString() + ` - Error: ${error}`)
            })
            this.ros.on('close', () => {
                this.logs.unshift((new Date()).toTimeString() + ' - Disconnected!')
                this.connected = false
                this.loading = false
            })

        },
        disconnect: function () {
            this.ros.close()
        },
        setTopic: function () {
            this.topic = new ROSLIB.Topic({
                ros: this.ros,
                name: '/cmd_vel',
                messageType: 'geometry_msgs/Twist'
            })
        },
        forward: function () {
            this.message = new ROSLIB.Message({
                linear: { x: 1, y: 0, z: 0, },
                angular: { x: 0, y: 0, z: 0, },
            })
            this.setTopic()
            this.topic.publish(this.message)
        },
        stop: function () {
            this.message = new ROSLIB.Message({
                linear: { x: 0, y: 0, z: 0, },
                angular: { x: 0, y: 0, z: 0, },
            })
            this.setTopic()
            this.topic.publish(this.message)
        },
        backward: function () {
            this.message = new ROSLIB.Message({
                linear: { x: -1, y: 0, z: 0, },
                angular: { x: 0, y: 0, z: 0, },
            })
            this.setTopic()
            this.topic.publish(this.message)
        },
        turnLeft: function () {
            this.message = new ROSLIB.Message({
                linear: { x: 0.5, y: 0, z: 0, },
                angular: { x: 0, y: 0, z: 0.5, },
            })
            this.setTopic()
            this.topic.publish(this.message)
        },
        turnRight: function () {
            this.message = new ROSLIB.Message({
                linear: { x: 0.5, y: 0, z: 0, },
                angular: { x: 0, y: 0, z: -0.5, },
            })
            this.setTopic()
            this.topic.publish(this.message)
        },
        sendCommand: function (_x, _z) {
            this.message = new ROSLIB.Message({
                linear: { x: _x, y: 0, z: 0, },
                angular: { x: 0, y: 0, z: _z, },
            })
            this.setTopic()
            this.topic.publish(this.message)
        },
        toggleAccelMode: function () {
            DeviceMotionEvent.requestPermission()
                .then(response => {
                    this.logs.unshift(response)
                    if (response == 'granted') {
                        window.addEventListener('devicemotion', this.accelCallback)
                    }
                })
                .catch(console.error)
            this.enable_accel = !this.enable_accel
            this.logs.unshift('enable accel controller ' + this.enable_accel)
        },
        accelCallback: function (e) {
            if (this.enable_accel) {
                var acc = [e.accelerationIncludingGravity.x, e.accelerationIncludingGravity.y];
                var maxima = [this.maxLin, this.maxAng]
                for (var i = 0; i < 2; i++) {
                    if (Math.abs(acc[i]) < 2) {
                        acc[i] = 0
                    } else {
                        var sign = Math.abs(acc[i]) / acc[i]
                        if (i == 0) acc[i] -= sign * 2
                        if (sign * acc[i] > 7) acc[i] = sign * 7
                        acc[i] = maxima[i] * acc[i] / 7
                    }
                }
                this.curLin = acc[0]
                this.curAng = acc[1]
            }
        },
        keepSendCommand: function () {
            this.sendCommand(this.curLin, this.curAng)
        },
        createJoystick: function () {
            this.nipple_manager = require('./node_modules/nipplejs').create(options)
            manager.on('start', function (event, nipple) {
                timer = setInterval(function () {
                    this.sendCommand(this.curLin, this.curAng);
                }, 100);
            });

            manager.on('move', function (event, nipple) {
                max_distance = 75.0; // pixels;
                linear_speed = Math.sin(nipple.angle.radian) * this.maxLin * nipple.distance / max_distance;
                angular_speed = -Math.cos(nipple.angle.radian) * this.maxAng * nipple.distance / max_distance;
            });

            manager.on('end', function () {
                if (timer) {
                    clearInterval(timer);
                }
                this.curAng=0
                this.curLin=0
                this.sendCommand(this.curLin, this.curAng)
            });
        }
    },
    mounted() {
        this.createJoystick()
        // setInterval(this.keepSendCommand, 500)
        this.logs.unshift('mounted')
    },
})

