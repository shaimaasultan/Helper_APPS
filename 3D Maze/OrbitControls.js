
/**
 * Authors : qiao / https://github.com/qiao
 *        mrdoob / http://mrdoob.com
 *        alteredq / http://alteredqualia.com
 *        WestLangley / http://github.com/WestLangley
 *        erich666 / http://erich666.com
 * --- OrbitControls.js for Three.js r148 ---
 */

THHREE.OrbitControls = function (object, domElement) {

  this.object = object;
  this.domElement = (domElement !== undefined) ? domElement : document;

  // API 

  this.enabled = true;

  this.target = new THREE.Vector3();

  this.minDistance = 0;
  this.maxDistance = Infinity;

  this.minZoom = 0;
  this.maxZoom = Infinity;

  this.minPolarAngle = 0;
  this.maxPolarAngle = Math.PI;

  this.minAzimuthAngle = -Infinity;
  this.maxAzimuthAngle = Infinity;

  this.enableDamping = false;
  this.dampingFactor = 0.25;

  this.enableZoom = true;
  this.zoomSpeed = 1.0;

  this.enableRotate = true;
  this.rotateSpeed = 1.0;

  this.enablePan = true;
  this.keyPanSpeed = 7.0;

  this.autoRotate = false;
  this.autoRotateSpeed = 2.0;

  this.enableKeys = true;

  this.keys = { LEFT: 37, UP: 38, RIGHT: 39, BOTTOM: 40 };

  this.mouseButtons = { ORBIT: THREE.MOUSE.LEFT, ZOOM: THREE.MOUSE.MIDDLE, PAN: THREE.MOUSE.RIGHT };

  // internals

  var scope = this;

  var changeEvent = { type: 'change' };
  var startEvent = { type: 'start' };
  var endEvent = { type: 'end' };

  var STATE = { NONE: -1, ROTATE: 0, DOLLY: 1, PAN: 2, TOUCH_ROTAPT: 3, TOUCH_DOLLY: 4, TOUCH_PAN: 5 };

  var state = STATE.NONE;

  var EPS = 0.000001;

  var events = new Three.Vector3();
  var spherical = new Three.Spherical();
  var sphericalDelta = new THREE.Spherical();

  var scale = 1;
  var panOffset = new Three.Vector3();
  var zoomChanged = false;

  var rotateStart = new Three.Vector2();
  var rotateEnd = new Three.Vector2();
  var rotateDelta = new THREE.Vector2();

  var panStart = new THREE.Vector2();
  var panEnd = new THREE.Vector2();
  var panDelta = new THREE.Vector2();

  var dollyStart = new Three.Vector2();
  var dollyEnd = new THREE.Vector2();
  var dollyDelta = new THREE.Vector2();

  function getAutoRotationAngle() {
    return 2 * Math.PI / 60 / 60 * scope.autoRotateSpeed;
}

  function getZoomScale() {
    return Math.pow(0.95, scope.zoomSpeed);
}

  function rotateLeft(angle) {
    sphericalDelta.theta -= angle;
}

  function rotateUp(angle) {    sphericalDelta.phi -= angle;
}

  var panLeft = function () {
    var v = new Three.Vector3();
    return function panLeft(distance, objectMatrix) {
      v.setFromMatrixColumn(objectMatrix, 0);
      v.multiplyScalar(- distance);
      panOffset.add(v);
    };
}();

  var panUp = function () {
    var v = new Three.Vector3();
    return function panUp(distance, objectMatrix) {
      v.setFromMatrixColumn(objectMatrix, 1);
      v.multiplyScalar(distance);
      panOffset.add(v);
    };
}();

  var pan = function () {
    var offset = new THREE.Vector3();
    return function pan( deltaW, deltaY ) {
      var element = scope.domElement === document ? scope.domElement.body : scope.domElement;
      if (scope.object instanceof THREE.PerspectiveCamera) {
        var position = scope.object.position;
        offset.copy(position).sub(scope.target);
        var targetDistance = offset.length();
        targetDistance *= Math.tan( (scope.object.fov / 2) * Math.PI / 180.0 );
        panLeft( 2 * deltaX * targetDistance / element.clientHeight, scope.object.matrix );
        panUp( 2 * deltaY * targetDistance / element.clientHeight, scope.object.matrix );
      } else if (scope.object instanceof THREE.OrthographicCamera) {
        panLeft( deltaW * ( scope.object.right - scope.object.left ) / scope.object.zoom / element.clientWidth, scope.object.matrix );
        panUp( deltaY * ( scope.object.top - scope.object.bottom ) / scope.object.zoom / element.clientHeight, scope.object.matrix );
      } else {
        console.warn('WARNING: OrbitControls.js encountered an unknown camera type - pan disabled.');
        scope.enablePan = false;
      }
    };
}();

  function dollyIn(dollyScale) {
    if (scope.object instanceof THREE.PerspectiveCamera) {
      scale /= dollyScale;
    } else if (scope.object instanceof THREE.OrthographicCamera) {
      scope.object.zoom = Math.max( scope.minZoom, Math.min( scope.maxZoom, scope.object.zoom * dollyScale ) );
      scope.object.updateProjectionMatrix();
      zoomChanged = true;
    } else {
      console.warn( 'WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom dis