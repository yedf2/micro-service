module.exports.f1 = (console, query, body)=>{
	return Promise.resolve({query, body, msg:'success'});
}
