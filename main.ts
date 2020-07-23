/**
 * Public domain. Use at your own risk!
 * Self-balancing robot controller, controlling a pair of FS90R servos.
 * Requires InvMPU and Trig package in custom.ts.
 * Update read_gyro_angle_rate() and read_accel_tilt_angle() to sensor mounting.
 * Update call to InvMPU.set_gyro_bias() with the bias of your sensor.
 */

// 调整参数
const TARGET_ANGLE = -9000; // 保持直立的角度，角度*100
const KP = 2400;//角度比例参数，角度
const KD = 24;//角度微分参数，角速度



const motor_bias = 0; // increase to reduce forward power to the right

//返回Y轴及速度
function read_gyro_angle_rate(): number {
    InvMPU.read_gyro()
    return -InvMPU.gyro_y
}

//返回通过角速度计算的角度偏差
function read_accel_tilt_angle(): number {
    InvMPU.read_accel()
    return Trig.atan2(InvMPU.accel_z, 0 - InvMPU.accel_x); // degrees * 100
}

//返回最新角度
function updateAngle(est_angle: number, delta_t_ms: number): number {
    //获取以角速度得到的角度
    let accel_angle = read_accel_tilt_angle(); // degrees * 100
    //获取角度加速度
    let gyro_angle_rate = read_gyro_angle_rate() * 200000 / 32768; // (degrees * 100) per second
    //通过角度加速度计算出角度变化
    let gyro_angle_change = gyro_angle_rate * delta_t_ms / 1000; // degrees * 100
    //一阶滤波
    let new_est_angle = (49 * (est_angle + gyro_angle_change) + accel_angle) / 50;
    return new_est_angle;
}

// Left motor connected with L293D



const motor_a_enable = AnalogPin.P13; // enable 1-2
const motor_a1 = DigitalPin.P2; // input 1
const motor_a2 = DigitalPin.P12; // input 2

// Right motor connect with L293D
const motor_b_enable = AnalogPin.P14; // enable 3-4
const motor_b1 = DigitalPin.P15; // input 3
const motor_b2 = DigitalPin.P16; // input 4

//停止所有电机
function motor_coast() {
    robotbit.MotorStopAll()    
}

function motor_move(left: number, right: number) {
    //控制左轮方向、转速
    robotbit.MotorRun(robotbit.Motors.M2B, left)
    //控制右轮方向、转速
    robotbit.MotorRun(robotbit.Motors.M1A, right)
}

function setup() {
    basic.showIcon(IconNames.Happy);
    while (true) {
        while (!input.buttonIsPressed(Button.A)) {
            basic.pause(10);
        }
        if (InvMPU.find_mpu()) {
            break;
        }
        basic.showIcon(IconNames.No);
    }
    InvMPU.reset_mpu();
    basic.pause(100);
    basic.clearScreen();
    //矫正偏差
    if (InvMPU.compute_gyro_bias()) {
        serial.writeLine("X variance " + InvMPU.var_x)
        serial.writeLine("Y variance " + InvMPU.var_y)
        serial.writeLine("Z variance " + InvMPU.var_z)
        serial.writeLine("X bias " + InvMPU.gyro_x_bias)
        serial.writeLine("Y bias " + InvMPU.gyro_y_bias)
        serial.writeLine("Z bias " + InvMPU.gyro_z_bias)
        InvMPU.set_gyro_bias(InvMPU.gyro_x_bias, InvMPU.gyro_y_bias, InvMPU.gyro_z_bias)
            
    } else {
        basic.showIcon(IconNames.Angry)
    }
    
}

//主循环
function control_loop() {
    //电机关闭
    let motor_on = false;
    //偏角，角度*100
    let est_angle = read_accel_tilt_angle(); // degrees * 100 from vertical
    //最近一次偏差
    let last_err = 0;
    
    let i_err = 0;
    
    //最近一次运行时间
    let last_time = input.runningTime();
    
    while (true) {
        //当前时间
        let current_time = input.runningTime();
        //间隔时间
        let delta_t = current_time - last_time;
        //将当前时间计入最近运行时间
        last_time = current_time;
        
        //最新角度偏差
        est_angle = updateAngle(est_angle, delta_t);
        
        //如果角度偏差超过30度（跌倒了），停止电机，参数归零
        if (motor_on && (est_angle > 3000 || est_angle < -3000)) {
            last_err = 0;
            i_err = 0;
            motor_coast();
            motor_on = false;
        }

        //偏角与设定角的差值
        let err = est_angle - TARGET_ANGLE;
        
        //如果电机允许运行
        if (motor_on) {
            let d_err = (err - last_err) * 1000 / delta_t;
            //last_err = err;
            //i_err = i_err + err * delta_t;
            //let u = err * KP + d_err * KD + i_err * KI;
            
            let u = err * KP + d_err * KD;
            
            let motor_out = u / 1000;
            let motor_right = motor_out - motor_bias;
            let motor_left = motor_out + motor_bias;
            motor_move(Math.clamp(-1024, 1023, motor_left), Math.clamp(-1024, 1023, motor_right));
        } else if (err <= 500 && err >= -500) {
            motor_on = true;
        }
        basic.pause(5);
    }
}

setup();
control_loop();