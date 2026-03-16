BINARY=nft-cli
GO=go
BUILD_DIR=build

.PHONY: build clean run help build-all build-linux build-windows build-macos

build:
	$(GO) build -o $(BINARY) .

build-linux:
	GOOS=linux GOARCH=amd64 $(GO) build -o $(BUILD_DIR)/$(BINARY)-linux-amd64 .
	GOOS=linux GOARCH=arm64 $(GO) build -o $(BUILD_DIR)/$(BINARY)-linux-arm64 .

build-windows:
	GOOS=windows GOARCH=amd64 $(GO) build -o $(BUILD_DIR)/$(BINARY)-windows-amd64.exe .

build-macos:
	GOOS=darwin GOARCH=amd64 $(GO) build -o $(BUILD_DIR)/$(BINARY)-darwin-amd64 .
	GOOS=darwin GOARCH=arm64 $(GO) build -o $(BUILD_DIR)/$(BINARY)-darwin-arm64 .

build-all: build-linux build-windows build-macos

clean:
	rm -f $(BINARY)
	rm -rf $(BUILD_DIR)

run: build
	./$(BINARY)

help: build
	./$(BINARY) --help
