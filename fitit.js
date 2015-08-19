function histofit(){

	///////////////////////////////////////////
	/////member variables//////////////////////
	///////////////////////////////////////////
	//Input
	this.x = []; //independent variables
	this.y = []; //dependent variables
	this.fxn = null; //function to fit, form: function(independent variable, [array of fittable parameters])
	this.guess = []; //initial fit guess

	//Output
	this.param = []; //fit parameters

	//Config
	this.stepSize = 1;  //initial size of step to take along gradient towards minima

	///////////////////////////////////////////
	/////member functions//////////////////////
	///////////////////////////////////////////

	//log probability of n counts in a bin where lambda were expected:
	this.logPoisson = function(n, lambda){
		var i, N=0;
		for(i=1; i<=n; i++)
			N += i;
//console.log([n, lambda, N])
		return n*Math.log(lambda) - lambda - N;
	}

	//negative log likelihood of seeing the observed spectrum given the theory function and <param> array
	this.NegLL = function(param){
		var lambda, i, 
		nll = 0;

		for(i=0; i<this.x.length; i++){
			lambda = this.fxn.bind(this, this.x[i], param)();
//console.log(lambda)
			nll -= this.logPoisson(this.y[i], lambda);
		}
//console.log(nll)
		return nll;
	}

	//derivative in negative log likelihood space along parameter index <dim> at parameter config <param>:
	this.nllDer = function(param, dim){
		var tol = 0.000001,
			dtol1, dtol2, Xhi=[], Xlo=[], Xhi2=[], Xlo2=[], vary, D;

		for(vary = 0; vary < param.length; vary++){
			Xhi[vary] = param[vary];
			Xlo[vary] = param[vary];
			Xhi2[vary] = param[vary];
			Xlo2[vary] = param[vary];
		}
	    Xhi[dim]  += tol;
	    Xlo[dim]  -= tol;
	    Xhi2[dim] += tol / 2;
	    Xlo2[dim] -= tol / 2;

	    dtol = (this.NegLL.bind(this, Xhi)() - this.NegLL.bind(this, Xlo)()) / (2*tol);
	    dtol2 = (this.NegLL.bind(this, Xhi2)() - this.NegLL.bind(this, Xlo2)()) / tol;

	    D = (4*dtol2-dtol)/3;
//console.log(Xhi)
//console.log(Xlo)
//console.log(D)
	    return D;
	}

	//gradient in negative log likelihood space:
	this.nllGrad = function(param){
		var grad = [],
			i, length=0;

		for(i=0; i<param.length; i++){
			grad[i] = this.nllDer(param, i);
			length += Math.pow(grad[i],2);
		}
		length = Math.sqrt(length);
		//normalize
		for(i=0; i<param.length; i++){
			grad[i] /= length;
		}

//console.log(grad)
		return grad;
	}

	//converge a fit
	this.fitit = function(){
		var i, grad, NLL, newNLL,
			dNLL = 1000,
			tolerance = 0.0001,
			limit = 1000;

		//demand same length of this.x and this.y
		if(this.x.length != this.y.length){
			console.log('length of input and output arrays must be equal; fit aborted.')
			return;
		}

		for(i=0; i<this.guess.length; i++)
			this.param[i] = this.guess[i];

		while(Math.abs(dNLL) > tolerance && limit>0){

			NLL = this.NegLL(this.param);
			grad = this.nllGrad(this.param);
//console.log(grad)
			//step towards mimium
			for(i=0; i<this.param.length; i++){
				this.param[i] -= grad[i]*this.stepSize;
			}

			newNLL = this.NegLL(this.param);

			//take smaller steps as we approach minimum
			if(newNLL > NLL)
				this.stepSize = this.stepSize/2;

			dNLL = newNLL - NLL;
			limit--;

		}
		this.stepSize = 1;

	}
};
