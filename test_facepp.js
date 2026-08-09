const formData = new URLSearchParams();
formData.append("api_key", "mock");
formData.append("api_secret", "mock");
formData.append("image_base64", "dummy");
console.log(formData.toString());
