package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
)

func homeHandler(w http.ResponseWriter, r *http.Request) {
	cwd, err := os.Getwd()
	if err != nil {
		http.Error(w, "Error getting current directory", http.StatusInternalServerError)
		log.Println("Error getting current directory:", err)
		return
	}
	publicDirBase := filepath.Join(cwd, "public", "client")
	fmt.Println("Serving ", publicDirBase)
	http.FileServer(http.Dir(publicDirBase)).ServeHTTP(w, r)
}

func main() {
	// Declaring the Mux
	mux := http.NewServeMux()

	// Mapping request directories to handler functions
	mux.HandleFunc("/", homeHandler)
	// .
	// .
	// .
	//mux.HandleFunc("/about", aboutHandler)

	//Port number must be changed to 80 for http and 443 for https before deploying
	port := "8080"
	log.Printf("Server starting on port %s...", port)

	// Creating a server and configuring port and mux
	server := &http.Server{
		Addr:    ":" + port,
		Handler: mux,
	}

	// Starting the server
	err := server.ListenAndServe()
	if err != nil {
		log.Fatal("ListenAndServe error: ", err)
	}
}
