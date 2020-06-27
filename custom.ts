

/**
 * Public domain. Use at your own risk!
 * Simplified interface for InvenSense MPU-6500, MPU-9250, MPU-9255
 */
//% weight=90 color=#0040A0
namespace InvMPU {
    export const MPU_6500_ID = 0x70;
    export const MPU_9250_ID = 0x71;
    export const MPU_9255_ID = 0x73;

    const MPU_ADDR = 0x68;
    const WHO_AM_I = 0x75;
    const REG_PWR_MGMT_1 = 0x6b;
    const REG_SIGNAL_PATH_RESET = 0x68;
    const REG_USER_CTRL = 0x6a;
    const REG_ACCEL_XOUT_H = 0x3b;
    const REG_ACCEL_YOUT_H = 0x3d;
    const REG_ACCEL_ZOUT_H = 0x3f;
    const REG_GYRO_XOUT_H = 0x43;
    const REG_GYRO_YOUT_H = 0x45;
    const REG_GYRO_ZOUT_H = 0x47;
    const REG_CONFIG = 0x1a;
    const REG_GYRO_CONFIG = 0x1b;
    const REG_ACCEL_CONFIG = 0x1c;
    const REG_ACCEL_CONFIG2 = 0x1d;
    const XG_OFFSET_H = 0x13;
    const YG_OFFSET_H = 0x15;
    const ZG_OFFSET_H = 0x17;

    function mpu_read(reg: number): number {
        pins.i2cWriteNumber(MPU_ADDR, reg, NumberFormat.UInt8BE, true);
        return pins.i2cReadNumber(MPU_ADDR, NumberFormat.UInt8BE, false);
    }

    function mpu_read_int16(reg: number): number {
        pins.i2cWriteNumber(MPU_ADDR, reg, NumberFormat.UInt8BE, true);
        return pins.i2cReadNumber(MPU_ADDR, NumberFormat.Int16BE, false);
    }

    function mpu_write(reg: number, data: number) {
        pins.i2cWriteNumber(MPU_ADDR, reg << 8 | (data & 0xff), NumberFormat.UInt16BE);
    }

    function mpu_write_int16(reg: number, data: number) {
        mpu_write(reg, (data >> 8) & 0xff);
        mpu_write(reg + 1, data & 0xff);
    }

    /**
     * Contains one of MPU_6500_ID, MPU_9250_ID, MPU_9255_ID or zero.
     */
    //% block
    export let sensor_id = 0;

    /**
     * Look for a MPU-6500, MPU-9250 or MPU-9255.
     * Returns true if the MPU was found.
     * The MPU id is in sensor_id.
     */
    //% block
    //% weight=99
    export function find_mpu(): boolean {
        sensor_id = mpu_read(WHO_AM_I);
        return sensor_id == MPU_9255_ID || sensor_id == MPU_9250_ID || sensor_id == MPU_6500_ID;
    }

    /**
     * Reset the MPU and configure the gyroscope to +- 2000 degrees/second and the accelerometer to +-16g.
     * The low pass filter settings control how sensitive the sensors are to quick changes.
     * In order of increasing sensitivity: 6, 5, 4, 3, 2, 1, 0, 7
     * Info from MPU-9250 register map document.
     * @param gyro_lpf Gyroscope low pass filter setting, eg: 0
     *   7: 8kHz sampling rate, 36001Hz bandwidth, 0.17ms delay.
     *   0: 8kHz sampling rate, 250Hz bandwidth, 0.97ms delay.
     *   1: 1kHz sampling rate, 184Hz bandwidth, 2.9ms delay.
     *   2: 1kHz sampling rate, 92Hz bandwidth, 3.9ms delay.
     *   3: 1kHz sampling rate, 41Hz bandwidth, 5.9ms delay.
     *   4: 1kHz sampling rate, 20Hz bandwidth, 9.9ms delay.
     *   5: 1kHz sampling rate, 10Hz bandwidth, 17.85ms delay.
     *   6: 1kHz sampling rate, 5Hz bandwidth, 33.48ms delay.
     * @param accel_lpf Accelerometer low pass filter setting, eg: 0
     *   7: 1kHz sampling rate, 420Hz 3dB bandwidth, 1.38ms delay.
     *   0: 1kHz sampling rate, 218.1Hz 3dB bandwidth, 1.88ms delay.
     *   1: 1kHz sampling rate, 218.1Hz 3dB bandwidth, 1.88ms delay.
     *   2: 1kHz sampling rate, 99Hz 3dB bandwidth, 2.88ms delay.
     *   3: 1kHz sampling rate, 44.8Hz 3dB bandwidth, 4.88ms delay.
     *   4: 1kHz sampling rate, 21.2Hz 3dB bandwidth, 8.87ms delay.
     *   5: 1kHz sampling rate, 10.2Hz 3dB bandwidth, 16.83ms delay.
     *   6: 1kHz sampling rate, 5.05Hz 3dB bandwidth, 32.48ms delay.
     */
    //% block
    //% weight=98
    export function reset_mpu(gyro_lpf=0, accel_lpf=0) {
        control.assert(gyro_lpf >= 0 || gyro_lpf <= 7, "gyro_lpf must be between 0 and 7");
        control.assert(accel_lpf >= 0 || accel_lpf <= 7, "accel_lpf must be between 0 and 7");
        mpu_write(REG_PWR_MGMT_1, 0x80); // H_RESET, internal 20MHz clock
        mpu_write(REG_SIGNAL_PATH_RESET, 0x7); // GYRO_RST | ACCEL_RST | TEMP_RST
        mpu_write(REG_USER_CTRL, 0x1); // SIG_COND_RST
        mpu_write(REG_CONFIG, gyro_lpf); 
        mpu_write(REG_GYRO_CONFIG, 0x18); // GYRO_FS_SEL = 3, +-2000 dps, DLPF on
        mpu_write(REG_ACCEL_CONFIG, 0x18); // ACCEL_FS_SEL = 3, +-16g
        mpu_write(REG_ACCEL_CONFIG2, accel_lpf); // DLPF on
    }

    /**
     * Gyro X axis value after calling read_gyro().
     * Value from -32768 to 32767.
     */
    //% block
    export let gyro_x = 0;

    /**
     * Gyro Y axis value after calling read_gyro().
     * Value from -32768 to 32767.
     */
    //% block
    export let gyro_y = 0;

    /**
     * Gyro Z axis value after calling read_gyro().
     * Value from -32768 to 32767.
     */
    //% block
    export let gyro_z = 0;

    /**
     * Read all three gyroscope axis values and store them in gyro_x, gyro_y and gyro_z.
     */
    //% block
    //% weight=95
    export function read_gyro() {
        gyro_x = mpu_read_int16(REG_GYRO_XOUT_H);
        gyro_y = mpu_read_int16(REG_GYRO_YOUT_H);
        gyro_z = mpu_read_int16(REG_GYRO_ZOUT_H);
    }

    /**
     * Accelerometer X axis value after calling read_accel().
     * Value from -32768 to 32767.
     */
    //% block
    export let accel_x = 0;

    /**
     * Accelerometer Y axis value after calling read_accel().
     * Value from -32768 to 32767.
     */
    //% block
    export let accel_y = 0;

    /**
     * Accelerometer Z axis value after calling read_accel().
     * Value from -32768 to 32767.
     */
    //% block
    export let accel_z = 0;

    /**
     * Read all three accelerometer values and store them in accel_x, accel_y and accel_z.
     */
    //% block
    //% weight=94
    export function read_accel() {
        accel_x = mpu_read_int16(REG_ACCEL_XOUT_H);
        accel_y = mpu_read_int16(REG_ACCEL_YOUT_H);
        accel_z = mpu_read_int16(REG_ACCEL_ZOUT_H);
    }

    export let var_x = 0;
    export let var_y = 0;
    export let var_z = 0;

    /**
     * Gyro X axis bias after calling get_gyro_bias().
     */
    //% block
    export let gyro_x_bias = 0;

    /**
     * Gyro Y axis bias after calling get_gyro_bias().
     */
    //% block
    export let gyro_y_bias = 0;

    /**
     * Gyro Z axis bias after calling get_gyro_bias().
     */
    //% block
    export let gyro_z_bias = 0;

    /**
     * Compute the gyro bias for all three axis. The bias for each axis is the average of 100 samples.
     * Returns true if the sensor is steady enough to calculate the bias.
     * The bias values are store in gyro_x_bias, gyro_y_bias and gyro_z_bias.
     */
    //% block
    //% weight=97
    export function compute_gyro_bias(): boolean {
        mpu_write_int16(XG_OFFSET_H, 0);
        mpu_write_int16(YG_OFFSET_H, 0);
        mpu_write_int16(ZG_OFFSET_H, 0);
        const N = 100;
        const MAX_VAR = 40;
        let sum_x = 0, sum_y = 0, sum_z = 0;
        let xs: number[] = [], ys: number[] = [], zs: number[] = [];
        for (let i = 0; i < N; i++) {
            let x = mpu_read_int16(REG_GYRO_XOUT_H);
            let y = mpu_read_int16(REG_GYRO_YOUT_H);
            let z = mpu_read_int16(REG_GYRO_ZOUT_H);
            sum_x += x;
            sum_y += y;
            sum_z += z;
            xs.push(x);
            ys.push(y);
            zs.push(z);
            basic.pause(1);
        }
        let mean_x = sum_x / N;
        let mean_y = sum_y / N;
        let mean_z = sum_z / N;
        var_x = 0;
        var_y = 0;
        var_z = 0;
        for (let i = 0; i < N; i++) {
            let dx = xs[i] - mean_x;
            var_x = var_x + dx * dx;
            let dy = ys[i] - mean_y;
            var_y = var_y + dy * dy;
            let dz = zs[i] - mean_z;
            var_z = var_z + dz * dz;
        }
        var_x = var_x / N;
        var_y = var_y / N;
        var_z = var_z / N;
        if (var_x > MAX_VAR || var_y > MAX_VAR || var_z > MAX_VAR) {
            return false;
        }
        gyro_x_bias = mean_x;
        gyro_y_bias = mean_y;
        gyro_z_bias = mean_z;
        return true;
    }

    /**
     * Set the gyro bias. The bias can be calculated by calling get_gyro_bias().
     * @param x_bias Bias in the X direction, eg: 0
     * @param y_bias Bias in the Y direction, eg: 0
     * @param z_bias Bias in the Z direction, eg: 0
     */
    //% block
    //% weight=96
    export function set_gyro_bias(x_bias: number, y_bias: number, z_bias: number) {
        mpu_write_int16(XG_OFFSET_H, -2 * x_bias);
        mpu_write_int16(YG_OFFSET_H, -2 * y_bias);
        mpu_write_int16(ZG_OFFSET_H, -2 * z_bias);
    }
}

/**
 * Public domain. Use at your own risk!
 * Trigonometry functions
 */
//% weight=90 color=#00A040
namespace Trig {
    const atan_table: number[] = [
        0, 1144, 2289, 3435, 4583, 5734, 6889, 8047, 9211, 10380, // 0
        11556, 12739, 13931, 15131, 16340, 17561, 18793, 20037, 21294, 22566, // 10
        23854, 25157, 26479, 27819, 29179, 30560, 31965, 33393, 34847, 36328, // 20
        37838, 39379, 40952, 42560, 44205, 45889, 47615, 49385, 51203, 53071, // 30
        54992, 56970, 59009, 61114, 63288, 65536, 67865, 70279, 72786, 75391, // 40
        78103, 80931, 83883, 86970, 90203, 93596, 97162, 100917, 104880, 109071, // 50
        113512, 118231, 123256, 128622, 134369, 140543, 147197, 154394, 162208, 170728, // 60
        180059, 190331, 201700, 214359, 228552, 244584, 262851, 283868, 308323, 337154, // 70
        371674, 413779, 466313, 533748, 623534, 749080, 937209, 1250502, 1876706, 3754555, // 80
        37549324, // 89.9 approx 90
    ];

    /**
     * Returns the inverse tangent of y/x in degrees * 100.
     * @param y Number between -32768 and 32768, eg: 2000
     * @param x Number between -32768 and 32768, eg: -1000
     */
    //% block
    //% weight=100
    export function atan2(y: number, x: number): number {
        // returns degrees * 100
        control.assert(y <= 32768 && y >= -32768, "atan2: y must be between -32768 and 32768: " + y)
        control.assert(x <= 32768 && x >= -32768, "atan2: x must be between -32768 and 32768: " + x)
        if (x == 0) {
            if (y == 0) {
                return 0;
            } else if (y > 0) {
                return 9000;
            } else {
                return -9000;
            }
        }
        let ratio = (y << 16) / x;
        let sign = 1;
        if (ratio < 0) {
            sign = -1;
            ratio = - ratio;
        }
        for (let i = 1; i < atan_table.length; i++) {
            if (ratio < atan_table[i]) {
                let d = atan_table[i] - atan_table[i - 1];
                let d2 = ratio - atan_table[i - 1];
                let d3 = d2 > 21474836 ? d2 * 10 / d * 10 : d2 * 100 / d;
                if (x < 0) {
                    return sign * ((i - 1) * 100 + d3 - 18000);
                } else {
                    return sign * ((i - 1) * 100 + d3);
                }
            }
        }
        return sign * 9000;
    }
    control.assert(atan2(0, 0) == 0, "bad atan2(0, 0) = " + atan2(0, 0));
    control.assert(atan2(1, 0) == 9000, "bad atan2(1, 0) = " + atan2(1, 0));
    control.assert(atan2(-1, 0) == -9000, "bad atan2(-1, 0) = " + atan2(-1, 0));
    control.assert(atan2(1, 1) == 4500, "bad atan2(1, 1) = " + atan2(1, 1));
    control.assert(atan2(-1, 1) == -4500, "bad atan2(-1, 1) = " + atan2(-1, 1));
    control.assert(atan2(1, -1) == 13500, "bad atan2(1, -1) = " + atan2(1, -1));
    control.assert(atan2(-1, -1) == -13500, "bad atan2(-1, -1) = " + atan2(1, 1));
    control.assert(atan2(1, 2) == 2656, "bad atan2(1, 2) = " + atan2(1, 2));
    control.assert(atan2(-1, 2) == -2656, "bad atan2(-1, 2) = " + atan2(-1, 2));
    control.assert(atan2(1, -2) == 15344, "bad atan2(1, -2) = " + atan2(1, -2));
    control.assert(atan2(-1, -2) == -15344, "bad atan2(-1, -2) = " + atan2(1, -2));
    control.assert(atan2(572, 1) == 8990, "bad atan2(572, 1) = " + atan2(572, 1));

    const sin_table: number[] = [
        0, 572, 1144, 1715, 2286, 2856, 3425, 3993, 4560, 5126, // 0
        5690, 6252, 6813, 7371, 7927, 8481, 9032, 9580, 10126, 10668, // 10
        11207, 11743, 12275, 12803, 13328, 13848, 14365, 14876, 15384, 15886, // 20
        16384, 16877, 17364, 17847, 18324, 18795, 19261, 19720, 20174, 20622, // 30
        21063, 21498, 21926, 22348, 22763, 23170, 23571, 23965, 24351, 24730, // 40
        25102, 25466, 25822, 26170, 26510, 26842, 27166, 27482, 27789, 28088, // 50
        28378, 28660, 28932, 29197, 29452, 29698, 29935, 30163, 30382, 30592, // 60
        30792, 30983, 31164, 31336, 31499, 31651, 31795, 31928, 32052, 32166, // 70
        32270, 32365, 32449, 32524, 32588, 32643, 32688, 32723, 32748, 32763, // 80
        32768,
    ];

    function sin_deg(d: number): number {
        if (d >= 0 && d <= 90) {
            return sin_table[d];
        } else if (d > 90 && d <= 180) {
            return sin_table[180 - d];
        } else if (d < 0 && d >= -90) {
            return -sin_table[-d];
        } else {
            return -sin_table[180 + d];
        }
    }
    function cos_deg(angle: number): number {
        if (angle >= 0) {
            return sin_deg(90 - angle);
        } else {
            return sin_deg(90 + angle);
        }
    }
    function sin_small(x: number): number {
        return [0, 57, 114, 172, 229, 286, 343, 400, 458, 515][x];
    }
    function cos_small(x: number): number {
        return [32768, 32768, 32768, 32768, 32767, 32767, 32766, 32766, 32765, 32764][x];
    }

    /**
     * Returns 32768 * sin of the angle.
     * @param angle Degrees * 100, between -18000 and 18000, eg: 9000
     */
    //% block
    //% weight=90
    export function sin(angle: number): number {
        control.assert(angle >= -18000 && angle <= 18000, "angle must be netween -18000 and 18000: " + angle);
        if (angle < 0) { // microbit rounds towards 0
            let z = (-angle + 5) / 10;
            let r = z % 10;
            let d = z / 10;
            return -(sin_deg(d) * cos_small(r) + cos_deg(d) * sin_small(r)) >> 15;
        } else {
            let z = (angle + 5) / 10;
            let r = z % 10;
            let d = z / 10;
            return (sin_deg(d) * cos_small(r) + cos_deg(d) * sin_small(r)) >> 15;
        }
    }

    control.assert(sin(0) == 0, "bad sin(0) = " + sin(0));
    control.assert(sin(3000) == 16384, "bad sin(3000) = " + sin(3000));
    control.assert(sin(6000) == 28378, "bad sin(6000) = " + sin(6000));
    control.assert(sin(9000) == 32768, "bad sin(9000) = " + sin(9000));
    control.assert(sin(12000) == 28378, "bad sin(12000) = " + sin(12000));
    control.assert(sin(15000) == 16384, "bad sin(15000) = " + sin(15000));
    control.assert(sin(18000) == 0, "bad sin(18000) = " + sin(18000));
    control.assert(sin(-3000) == -16384, "bad sin(-3000) = " + sin(-3000));
    control.assert(sin(-6000) == -28378, "bad sin(-6000) = " + sin(-6000));
    control.assert(sin(-9000) == -32768, "bad sin(-9000) = " + sin(-9000));
    control.assert(sin(-12000) == -28378, "bad sin(-12000) = " + sin(-12000));
    control.assert(sin(-15000) == -16384, "bad sin(-15000) = " + sin(-15000));
    control.assert(sin(-18000) == 0, "bad sin(-18000) = " + sin(-18000));
    control.assert(sin(10) == 57, "bad sin(10) = " + sin(10));
    control.assert(sin(20) == 114, "bad sin(20) = " + sin(20));
    control.assert(sin(30) == 172, "bad sin(30) = " + sin(30));
    control.assert(sin(40) == 229, "bad sin(40) = " + sin(40));
    control.assert(sin(50) == 286, "bad sin(50) = " + sin(50));
    control.assert(sin(60) == 343, "bad sin(60) = " + sin(60));
    control.assert(sin(70) == 400, "bad sin(70) = " + sin(70));
    control.assert(sin(80) == 458, "bad sin(80) = " + sin(80));
    control.assert(sin(90) == 515, "bad sin(90) = " + sin(90));
    control.assert(sin(-10) == -57, "bad sin(-10) = " + sin(-10));
    control.assert(sin(-20) == -114, "bad sin(-20) = " + sin(-20));
    control.assert(sin(-30) == -172, "bad sin(-30) = " + sin(-30));
    control.assert(sin(-40) == -229, "bad sin(-40) = " + sin(-40));
    control.assert(sin(-50) == -286, "bad sin(-50) = " + sin(-50));
    control.assert(sin(-60) == -343, "bad sin(-60) = " + sin(-60));
    control.assert(sin(-70) == -400, "bad sin(-70) = " + sin(-70));
    control.assert(sin(-80) == -458, "bad sin(-80) = " + sin(-80));
    control.assert(sin(-90) == -515, "bad sin(-90) = " + sin(-90));
    control.assert(sin(3000) == 16384, "bad sin(3000) = " + sin(3000));
    control.assert(sin(3010) == 16433, "bad sin(3010) = " + sin(3010)); // should really be 16434
    control.assert(sin(3020) == 16482, "bad sin(3020) = " + sin(3020)); // should really be 16483
    control.assert(sin(3030) == 16532, "bad sin(3030) = " + sin(3030));
    control.assert(sin(3040) == 16581, "bad sin(3040) = " + sin(3040)); // should really be 16582
    control.assert(sin(3050) == 16631, "bad sin(3050) = " + sin(3050));
    control.assert(sin(3060) == 16680, "bad sin(3060) = " + sin(3060));
    control.assert(sin(3070) == 16729, "bad sin(3070) = " + sin(3070));
    control.assert(sin(3080) == 16779, "bad sin(3080) = " + sin(3080));
    control.assert(sin(3090) == 16828, "bad sin(3090) = " + sin(3090));
    control.assert(sin(-3000) == -16384, "bad sin(-3000) = " + sin(-3000));
    control.assert(sin(-3010) == -16434, "bad sin(-3010) = " + sin(-3010));
    control.assert(sin(-3020) == -16483, "bad sin(-3020) = " + sin(-3020));
    control.assert(sin(-3030) == -16533, "bad sin(-3030) = " + sin(-3030)); // should really be -16532
    control.assert(sin(-3040) == -16582, "bad sin(-3040) = " + sin(-3040));
    control.assert(sin(-3050) == -16632, "bad sin(-3050) = " + sin(-3050)); // should really be -16631
    control.assert(sin(-3060) == -16681, "bad sin(-3060) = " + sin(-3060)); // should really be -16680
    control.assert(sin(-3070) == -16730, "bad sin(-3070) = " + sin(-3070)); // should really be -16729
    control.assert(sin(-3080) == -16780, "bad sin(-3080) = " + sin(-3080)); // should really be -16779
    control.assert(sin(-3090) == -16829, "bad sin(-3090) = " + sin(-3090)); // should really by -16828

    /**
     * Returns 32768 * cos of the angle.
     * @param angle Degrees * 100, between -18000 and 18000, eg: 9000
     */
    //% block
    //% weight=89
    export function cos(angle: number): number {
        if (angle >= 0) {
            return sin(9000 - angle);
        } else {
            return sin(9000 + angle);
        }
    }
    control.assert(cos(0) == 32768, "bad cos(0) = " + cos(0));
    control.assert(cos(3000) == 28378, "bad cos(000) = " + cos(3000));
    control.assert(cos(6000) == 16384, "bad cos(6000) = " + cos(6000));
    control.assert(cos(9000) == 0, "bad cos(9000) = " + cos(9000));
    control.assert(cos(12000) == -16384, "bad cos(12000) = " + cos(12000));
    control.assert(cos(15000) == -28378, "bad cos(15000) = " + cos(15000));
    control.assert(cos(18000) == -32768, "bad cos(18000) = " + cos(18000));
    control.assert(cos(-3000) == 28378, "bad cos(-3000) = " + cos(-3000));
    control.assert(cos(-6000) == 16384, "bad cos(-6000) = " + cos(-6000));
    control.assert(cos(-9000) == 0, "bad cos(-9000) = " + cos(-9000));
    control.assert(cos(-12000) == -16384, "bad sin(-12000) = " + sin(-12000));
    control.assert(cos(-15000) == -28378, "bad sin(-15000) = " + sin(-15000));
    control.assert(cos(-18000) == -32768, "bad sin(-18000) = " + sin(-18000));

    /**
     * Rotates a vector [x, y] by angle degrees anti-clockwise and updates it in place.
     * @param angle Degrees * 100, between -18000 and 18000, eg: 9000
     * @param v Vector represemted as an array [x, y]
     */
    //% block
    //% weight=80
    export function rotate2d(angle: number, v: number[]) {
        let c = cos(angle);
        let s = sin(angle);
        let v0 = (c * v[0] - s * v[1]) >> 15;
        let v1 = (s * v[0] + c * v[1]) >> 15;
        v[0] = v0;
        v[1] = v1;
    }
    let t: number[] = [20000, 30000];
    rotate2d(9000, t);
    control.assert(t[0] == -30000 && t[1] == 20000, "After rotate 90 wrong: " + t[0] + ", " + t[1]);
    rotate2d(-9000, t);
    control.assert(t[0] == 20000 && t[1] == 30000, "After rotate -90 wrong: " + t[0] + ", " + t[1]);
    rotate2d(4500, t);
    control.assert(t[0] == -7071 && t[1] == 35354, "After rotate 45 wrong: " + t[0] + ", " + t[1]);
    rotate2d(-4500, t);
    control.assert(t[0] == 19998 && t[1] == 29998, "After rotate -45 wrong: " + t[0] + ", " + t[1]);
}