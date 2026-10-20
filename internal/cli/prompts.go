package cli

import (
	"context"
	"fmt"
	"io"
	"sync"
	"time"

	"github.com/kidskoding/myleet/internal/app"
	"github.com/kidskoding/myleet/internal/prompt"
)

const (
	promptWorkers = 4
	promptSpacing = 150 * time.Millisecond // stay polite to LeetCode's API
)

func downloadPrompts(a *app.App, stdout io.Writer) int {
	problems := a.Catalog.Problems()
	counts := map[prompt.Status]int{}
	var mu sync.Mutex
	jobs := make(chan int)
	var wg sync.WaitGroup
	for w := 0; w < promptWorkers; w++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for i := range jobs {
				res := a.Prompts.Get(context.Background(), problems[i])
				mu.Lock()
				counts[res.Status]++
				done := counts[prompt.Fetched] + counts[prompt.Cached] + counts[prompt.Premium] + counts[prompt.Offline] + counts[prompt.NoSource] + counts[prompt.Authored]
				if res.Status == prompt.Fetched && done%25 == 0 {
					fmt.Fprintf(stdout, "%s %d/%d\n", th.Muted.Render("…"), done, len(problems))
				}
				mu.Unlock()
				if res.Status == prompt.Fetched {
					time.Sleep(promptSpacing)
				}
			}
		}()
	}
	for i := range problems {
		jobs <- i
	}
	close(jobs)
	wg.Wait()

	fmt.Fprintf(stdout, "%s %d fetched, %d cached, %d written in the repo\n", okTag(),
		counts[prompt.Fetched], counts[prompt.Cached], counts[prompt.Authored])
	if n := counts[prompt.Premium]; n > 0 {
		fmt.Fprintf(stdout, "%s  %d premium on LeetCode (statement not public; add a prompt in problem.toml)\n", th.Due.Render("note"), n)
	}
	if n := counts[prompt.NoSource]; n > 0 {
		fmt.Fprintf(stdout, "%s  %d not on LeetCode (add a prompt in problem.toml)\n", th.Due.Render("note"), n)
	}
	if n := counts[prompt.Offline]; n > 0 {
		fmt.Fprintf(stdout, "%s  %d could not be fetched; run again later\n", failTag(), n)
		return 1
	}
	return 0
}
