package main

import (
	"encoding/json"
	"net/http"
)

func helloHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	json.NewEncoder(w).Encode(map[string]string{
		"message": "Hello from Gotham API!",
	})
}

func main() {
	http.HandleFunc("/api/hello", helloHandler)

	println("Gotham API running on :8080")

	http.ListenAndServe(":8080", nil)
}
