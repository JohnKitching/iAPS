'use strict';

// Only manually dispatched runs actually execute the official build when
// AUTO_BUILD_BRANCHES is unset. A successful, skipped push run is not an upload.
module.exports = async function checkDevUpdate({ github, context, core, now = Date.now() }) {
  const repo = context.repo;
  const { data: upstream } = await github.rest.repos.getBranch({
    owner: 'Artificial-Pancreas', repo: 'iAPS', branch: 'dev'
  });
  const { data: target } = await github.rest.repos.getBranch({ ...repo, branch: 'dev' });
  const sha = upstream.commit.sha;
  const previousSha = target.commit.sha;
  if (!/^[0-9a-f]{40}$/.test(sha) || !/^[0-9a-f]{40}$/.test(previousSha)) {
    throw new Error('GitHub returned an invalid commit SHA.');
  }
  const { data } = await github.rest.actions.listWorkflowRuns({
    ...repo, workflow_id: 'build_iAPS.yml', branch: 'dev',
    event: 'workflow_dispatch', per_page: 100
  });
  const runs = data.workflow_runs;
  const active = runs.find(run => run.status !== 'completed');
  const successful = runs.find(run => run.conclusion === 'success');
  const latest = runs[0];
  const force = context.eventName === 'workflow_dispatch' &&
    String(context.payload.inputs?.force) === 'true';
  const ageDays = run => (now - Date.parse(run.updated_at || run.created_at)) / 86400000;
  let reason;
  let build = false;
  if (active) {
    reason = `Build ${active.id} is already active; no duplicate requested.`;
  } else if (!force && successful?.head_sha === sha && ageDays(successful) < 60) {
    reason = 'This upstream commit was already built successfully within the last 60 days.';
  } else if (!force && context.eventName !== 'workflow_dispatch' &&
             latest?.head_sha === sha && latest.conclusion !== 'success' && ageDays(latest) < 1) {
    reason = 'The last build failed or was cancelled. Automatic retry waits 24 hours; a manual check can retry now.';
  } else {
    build = true;
    reason = force ? 'Manual rebuild requested.' :
      successful?.head_sha === sha ? 'Refreshing the TestFlight build after 60 days.' :
      'This upstream commit has not yet been built successfully.';
  }
  core.setOutput('sha', sha);
  core.setOutput('previous_sha', previousSha);
  core.setOutput('build', String(build));
  core.setOutput('sync', String(build && previousSha !== sha));
  await core.summary.addHeading('Upstream dev check')
    .addRaw(`Upstream commit: ${sha}\n\n${reason}\n`).write();
};
