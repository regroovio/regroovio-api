
export const buildHeaders = (token) => ({
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
});

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const handleError = (error, context) => {
    console.log(`Error ${context}:`);
    console.log(error.message);
    if (error.response) {
        console.log(error.response.data);
    }
};
