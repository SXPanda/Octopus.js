Octopus.extendMethods('getPhysicsObjects', function() {
	var cache,
		frame = Time.frame;
	if (cache = Cache.getValue('Physics_physicsObjects'))
		return cache;
	var objects = Octopus.scene.objects,
		physicsObjects = [];
	
	for (var o in objects)
		if (objects[o].physicsEnabled)
			physicsObjects.push(objects[o]);
	
	Cache.setValue('Physics_physicsObjects', physicsObjects);
	//console.log('setCache ' + frame);
	return physicsObjects;
});

var Physics = Octopus.core.createClass('Physics', {
	gravity : {x: 0, y: -9.8},
	debug : false,
	cachedPhysicsObjects : {}
}, false, true);


Octopus.core.createClass('PhysicsObject',{
	inertia : {x: 0, y: 0},
	bounds: {x: 0, y: 0, w: 0, h: 0},
	borders: {top: false, bottom: false, left: false, right: false},
	drag : 0.0125,
	gravityEnabled : true,
	physicsEnabled : true,
	beforeUpdate : function() {
		this.applyGravity();
		this.applyDrag();
		
		/* tmpBounds is an assumption of where the object will be at the end of the frame, before collision is applied */
		var physicsObjects = Octopus.methods.getPhysicsObjects(this.id),
			tmpBounds = $.extend({}, this.bounds);
		
		tmpBounds.x += this.inertia.x;
		tmpBounds.y -= this.inertia.y;
		
		for (var i = 0, l = physicsObjects.length; i < l; ++ i)
		{
			if (Object.is(this, physicsObjects[i]))
				continue;
			/* check if our trajectory is clear of obstacles, using the tmpBounds estimation of where our div should be */
			if (this.checkCollision(tmpBounds, physicsObjects[i]))
			{				
				/* check the actual difference in position between two elements, using the objects current position (not the estimated tmpBounds) */
				var deltaPos = this.checkPositionDelta(this.bounds, physicsObjects[i].bounds);
				
				if (deltaPos.x === 0 && deltaPos.y === 0){
					deltaPos.x = Math.Infinity;
					console.log('corner collision');
				}
				
				//console.log(deltaPos.x, deltaPos.y);
				
				if (deltaPos.x !== false && deltaPos.x < this.inertia.x * Math.sign(this.inertia.x)){
					this.inertia.x = Math.clamp(this.inertia.x, -deltaPos.x, deltaPos.x);
				}
				
				if (deltaPos.y !== false && deltaPos.y < this.inertia.y * Math.sign(this.inertia.y))
					this.inertia.y = Math.clamp(this.inertia.y, -deltaPos.y, deltaPos.y);
				
				/*if (this.borders.top || this.borders.bottom)
					this.inertia.y = 0;
				if (this.borders.left || this.borders.right)
					this.inertia.x = 0;*/
				//this.inertia = {x: 0, y: 0};
				//return false;
			}
		}
		
		//console.log(this.inertia);
		this.translate(this.inertia.x, this.inertia.y);
		
		tmpBounds = $.extend({}, this.bounds);
		tmpBounds.x += this.inertia.x;
		tmpBounds.y -= this.inertia.y;
		this.bounds = tmpBounds;
	},
	applyGravity : function() {
		if (!this.gravityEnabled)
			return false;
		this.addForce(Physics.gravity.x * Time.deltaTime, Physics.gravity.y * Time.deltaTime);
	},
	addForce : function(x, y) {
		this.inertia.x += x;
		this.inertia.y += y;
	},
	applyDrag : function(x, y) {
		this.inertia.x *= 1-this.drag;
		this.inertia.y *= 1-this.drag;
	},
	checkCollision : function(self, other) {
		var bounds = other.bounds;
		if (self.x + self.w >= bounds.x &&
			self.x <= bounds.x + bounds.w &&
			self.y + self.h >= bounds.y &&
			self.y <= bounds.y + bounds.h) {
				return true;
		}
		return false;
	},
	checkPositionDelta : function (self, other) {
		var deltaPos = {x: false, y: false};
		
		// if to the left of the object, ignore the fact that we are travelling right as it has no impact on the collision
		if (this.inertia.x > 0 && self.x + self.w <= other.x) {
			if (this.inertia.y > 0 && self.y >= other.y + other.h) {
				//travelling up and to the right
				console.log('up and right');
				deltaPos = {
					x: other.x - (self.x + self.w),
					y: self.y - (other.y + other.h)
				}
				
			} else if (this.inertia.y < 0 && self.y + self.h <= other.y) {
				//travelling down and to the right
				console.log('down and right');
				
				deltaPos = {
					x: other.x - (self.x + self.w),
					y: self.y + self.h - other.y
				}
				
			} else {
				console.log('right');
				//travelling directly to the right
				deltaPos = {
					x: other.x - (self.x + self.w),
					y: false
				}
				
			}
		} else if (this.inertia.x < 0 && self.x >= other.x + other.w) {
			if (this.inertia.y >= 0 && self.y >= other.y + other.h) {
				//travelling up and to the right
				console.log('up and left');
				
				deltaPos = {
					x: self.x - (other.x + other.w),
					y: self.y - (other.y + other.h)
				}
				
			} else if (this.inertia.y < 0 && self.y + self.h <= other.y) {
				//travelling down and to the right
				console.log('down and left');
				
				deltaPos = {
					x: self.x - (other.x + other.w),
					y: self.y + self.h - other.y
				}
				
			} else {
				//travelling directly to the right			
				console.log('left');	
				console.log(self.x, other.x, other.w);
				console.log(self.x - other.x + other.w);
				deltaPos = {
					x: self.x - (other.x + other.w),
					y: false
				}
				
			}
		} else {
			if (this.inertia.y > 0 && self.y >= other.y + other.h) {
				//travelling up and to the right
				console.log('up');
				
				deltaPos = {
					x: false,
					y: self.y - (other.y + other.h)
				}
				
			} else if (this.inertia.y < 0 && self.y + self.h <= other.y) {
				//travelling down and to the right
				console.log('down');
				
				deltaPos = {
					x: false,
					y: self.y + self.h - other.y
				}
				
			} else {
				//travelling directly to the right	
				console.log('nowhere');			
				deltaPos = {
					x: false,
					y: false
				}
				
			}
		}
		
		console.log(deltaPos);
		/*if (deltaPos.x !== false)
			this.inertia.x = deltaPos.x;
		if (deltaPos.y !== false)
			this.inertia.y = deltaPos.y;*/
		if (deltaPos.x !== false)
			deltaPos.x *= Math.sign(deltaPos.x);
		if (deltaPos.y !== false)
			deltaPos.y *= Math.sign(deltaPos.y);
		
		var delta = {x : false, y: false};
		
		//if horizontally overlaps with object
		if (self.y + self.h > other.y && self.y < other.y + other.h ) {
			if (self.x < other.x) {
				delta.x = self.x + self.w - other.x;
				if (delta.x == 0)
					this.borders.right = true;
			} else {
				delta.x = other.x + other.w - self.x;
				if (delta.x == 0)
					this.borders.left = true;
			}
		}
		
		//if vertically overlaps with object
		if (self.x + self.w > other.x && self.x < other.x + other.w ) {
			if (self.y < other.y) {
				delta.y = self.y + self.h - other.y;
				if (delta.y == 0)
					this.borders.bottom = true;
			} else {
				delta.y = other.y + other.h - self.y;
				if (delta.y == 0)
					this.borders.top = true;
			}
		}/*
		if (delta.x !== false)
			delta.x *= Math.sign(delta.x);
		if (delta.y !== false)
			delta.y *= Math.sign(delta.y);
		
		//if (delta.x == 0)
		//	delta.x = Math.Infinity;
		//if (delta.y == 0)
			//delta.y = Math.Infinity;
		
		return delta;*/
		
		
		return deltaPos;
	},
	angleBetween : function(self, other, radians) {
		var angle = Math.atan2(other.y - self.y, other.x - self.x);
		
		if (radians)
			return angle;
		
		else
			return angle * 180 / Math.PI;
	},
	afterUpdate : function(ctx) {
		if (Physics.debug) {
			ctx.beginPath();
			ctx.rect(this.bounds.x, this.bounds.y, this.bounds.w, this.bounds.h);
			ctx.strokeStyle = 'green';
			ctx.stroke();
			ctx.closePath();
		}
		
		this.borders = {top: false, bottom: false, left: false, right: false};
	}
}, Octopus.Object);

Octopus.core.createClass('PhysicsCircle',{
	fillColor : false,
	strokeColor : false,
	radius : 0,
	start : function(x, y, r, fill, stroke, disableGravity) {
		this.fillColor = fill;
		this.strokeColor = stroke;	
		this.position = {x : x, y : y};
		this.radius = r;
		this.bounds = {x: x - r, y: y - r, w: r * 2, h: r * 2};
		//this.render();
		console.log(this);
		this.gravityEnabled = !disableGravity;
	},
	render : function(ctx) {
			
		ctx.beginPath();
		ctx.arc(this.position.x, this.position.y, this.radius, 0, 2* Math.PI);
		ctx.strokeStyle = this.strokeColor;
		ctx.fillStyle = this.fillColor;
		ctx.stroke();
		ctx.fill();
		ctx.closePath();
	},
	/*update : function() {
		
		this.addForce((InputController.getAxis('horizontal') + InputController.getAxis('horAlt')) * Time.deltaTime * 20, InputController.getAxis('vertical') * Time.deltaTime * 20)
	}*/
}, Octopus.PhysicsObject);

Octopus.core.createClass('PhysicsRect',{
	fillColor : false,
	strokeColor : false,
	width : 0,
	height: 0,
	start : function(x, y, w, h, fill, stroke, disableGravity) {
		this.fillColor = fill;
		this.strokeColor = stroke;	
		this.position = {x : x, y : y};
		this.width = w;
		this.height = h;
		
		this.bounds = {x: x, y: y, w: w, h: h};
		this.gravityEnabled = !disableGravity;
		//this.render();
	},
	render : function(ctx) {
			
		ctx.beginPath();
		ctx.rect(this.position.x, this.position.y, this.width, this.height);
		ctx.strokeStyle = this.strokeColor;
		ctx.fillStyle = this.fillColor;
		ctx.stroke();
		ctx.fill();
		ctx.closePath();
	}
}, Octopus.PhysicsObject);

Octopus.core.createClass('PhysicsSprite', {
	sprite : false,
	start : function(spriteSrc, x, y, w, h, disableGravity) {
		this.sprite = new Image();
		//this.sprite.crossOrigin = "anonymous";
		this.sprite.src = spriteSrc;
		this.position = {x : x, y : y};
		this.width = w;
		this.height = h;
		this.bounds = {x: x, y: y, w: w, h: h};
		this.gravityEnabled = !disableGravity;
	},
	render : function (ctx) {
		ctx.drawImage(this.sprite, this.position.x, this.position.y, this.width, this.height);
	},
}, Octopus.PhysicsObject);

Octopus.core.createClass('PhysicsCharacter', {
	isGrounded : function() {
		return this.borders.bottom;
	},
	update : function() {
		
		//this.addForce((InputController.getAxis('horizontal') + InputController.getAxis('horAlt')) * Time.deltaTime * 20, InputController.getAxis('vertical') * Time.deltaTime * 20)
		this.addForce((InputController.getAxis('horizontal') + InputController.getAxis('horAlt')) * Time.deltaTime * 20, 0);
		
		if (InputController.getInputDown('jump') && this.isGrounded())
			this.addForce(0, 5);
	}
}, Octopus.PhysicsSprite)
