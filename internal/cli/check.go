package cli

import (
	"context"
	"flag"
	"fmt"
	"io"
	"os"
	"sync"

	"github.com/kidskoding/myleet/internal/app"
	"github.com/kidskoding/myleet/internal/catalog"
	"github.com/kidskoding/myleet/internal/runner"
)

const checkWorkers = 8

type job struct {
	problem *catalog.Problem
	code    string
}

func check(a *app.App, args []string, stdout, stderr io.Writer) int {
	fs := flag.NewFlagSet("check", flag.ContinueOnError)
	fs.SetOutput(stderr)
	solutions := fs.Bool("solutions", false, "run reference solution.py files")
	if err := fs.Parse(args); err != nil {
		return 2
	}
	if a.PythonErr != nil {
		fmt.Fprintln(stderr, "myleet:", a.PythonErr)
		return 1
	}
	var jobs []job
	pick := func(p *catalog.Problem) (string, bool) {
		if *solutions {
			return p.SolutionPath(), p.HasSolution
		}
		path := a.Workspace.AttemptPath(p.ID)
		_, err := os.Stat(path)
		return path, err == nil
	}
	if id := fs.Arg(0); id != "" {
		p, ok := a.Catalog.Problem(id)
		if !ok {
			fmt.Fprintf(stderr, "myleet: no problem %q\n", id)
			return 1
		}
		code, ok := pick(p)
		if !ok {
			what := "no attempt yet (open it with `myleet open " + id + "`)"
			if *solutions {
				what = "no solution.py"
			}
			fmt.Fprintf(stderr, "myleet: %s: %s\n", id, what)
			return 1
		}
		jobs = append(jobs, job{p, code})
	} else {
		for _, p := range a.Catalog.Problems() {
			if code, ok := pick(p); ok {
				jobs = append(jobs, job{p, code})
			}
		}
	}

	results := make([]runner.Result, len(jobs))
	var wg sync.WaitGroup
	sem := make(chan struct{}, checkWorkers)
	for i, j := range jobs {
		wg.Add(1)
		go func() {
			defer wg.Done()
			sem <- struct{}{}
			defer func() { <-sem }()
			results[i] = a.Runner.Run(context.Background(), j.problem.TestPath(), j.code)
		}()
	}
	wg.Wait()

	failed := 0
	for i, j := range jobs {
		res := results[i]
		if res.Green() {
			fmt.Fprintf(stdout, "%s  %-40s %s\n", okTag(), j.problem.ID, th.Muted.Render(fmt.Sprintf("%d/%d", res.Passed, res.Total)))
			continue
		}
		failed++
		fmt.Fprintf(stdout, "%s  %-40s %d/%d  %s\n", failTag(), j.problem.ID, res.Passed, res.Total, th.Fail.Render(failureLine(res)))
	}
	summary := th.Pass.Render(fmt.Sprintf("%d passed", len(jobs)-failed)) + ", "
	if failed > 0 {
		summary += th.Fail.Render(fmt.Sprintf("%d failed", failed))
	} else {
		summary += th.Muted.Render("0 failed")
	}
	fmt.Fprintln(stdout, summary)
	if failed > 0 {
		return 1
	}
	return 0
}

func failureLine(res runner.Result) string {
	switch {
	case res.Err != nil:
		return res.Err.Error()
	case res.TimedOut:
		return "timed out"
	case res.NotStarted:
		return "not started"
	}
	for _, t := range res.Tests {
		if t.Outcome != runner.Passed {
			return t.Name + ": " + t.Message
		}
	}
	return "no tests ran"
}
